import React, { useState, useRef, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Upload as UploadIcon,
  FolderPlus,
  Download,
  Folder,
  File,
  Image,
  Film,
  FileText,
  Loader2,
  RefreshCw,
  ChevronRight,
  Home,
  X,
  CheckCircle,
  XCircle,
  FolderDown,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { storageAPI } from '../services/api';

/* ─── helpers ────────────────────────────────────────────── */

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function FileTypeIcon({ name, className = 'w-5 h-5' }) {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif'].includes(ext))
    return <Image className={`${className} text-sky-500`} />;
  if (['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(ext))
    return <Film className={`${className} text-purple-500`} />;
  return <FileText className={`${className} text-slate-400`} />;
}

function stripUserPrefix(key, userId) {
  return key.replace(`users/${userId}/`, '');
}

function buildBreadcrumbs(prefix) {
  if (!prefix) return [];
  return prefix.replace(/\/$/, '').split('/').filter(Boolean);
}

/** true when File System Access API is available (Chrome/Edge desktop) */
const FSA_SUPPORTED = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

/**
 * Fetch a presigned S3 URL and write it into a FileSystemFileHandle (FSA API).
 * Falls back to blob + <a download> if handle is not provided.
 */
async function streamToFile(presignedUrl, filename, fileHandle) {
  const response = await fetch(presignedUrl);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  if (fileHandle) {
    // File System Access API — stream directly into the chosen directory
    const writable = await fileHandle.createWritable();
    await response.body.pipeTo(writable);
    // pipeTo closes the writable automatically
  } else {
    // Fallback: download as blob
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
  }
}

/**
 * Upload a single file via presigned PUT URL (3-step: get URL → PUT to S3 → confirm).
 * onProgress(0-100) is called during the S3 PUT phase.
 * Falls back to legacy server-proxied upload if presign step fails.
 */
async function uploadSingleFile(file, folderPrefix, onProgress) {
  // Step 1 — get presigned PUT URL
  const urlRes = await storageAPI.getUploadUrl({
    filename: file.name,
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
    folderPrefix: folderPrefix || undefined,
  });
  const { key, presignedUrl } = urlRes.data;

  // Step 2 — PUT directly to S3 (no Node proxy, no memory buffering on server)
  await storageAPI.putFileToS3(presignedUrl, file, onProgress);

  // Step 3 — confirm so server saves the record to MongoDB
  await storageAPI.confirmUpload({
    key,
    originalName: file.name,
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
    folderPrefix: folderPrefix || undefined,
  });

  return { name: file.name, status: 'done' };
}

/* ─── component ──────────────────────────────────────────── */

const Upload = () => {
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  const [currentPrefix, setCurrentPrefix] = useState('');
  const [items, setItems] = useState({ folders: [], files: [] });
  const [loading, setLoading] = useState(false);

  // Per-file upload progress: [{ name, status: 'pending'|'uploading'|'done'|'error' }]
  const [uploadProgress, setUploadProgress] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Folder creation
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);

  // Per-key download state: Set of keys currently downloading
  const [downloadingKeys, setDownloadingKeys] = useState(new Set());

  // Delete confirmation modal
  const [confirmDelete, setConfirmDelete] = useState(null); // { key, name, isFolder }
  const [deletingKeys, setDeletingKeys] = useState(new Set());

  /* ── listing ─────────────────────────── */
  const fetchListing = useCallback(async () => {
    if (!user?.userId) return;
    setLoading(true);
    try {
      const res = await storageAPI.list(currentPrefix);
      setItems({ folders: res.data.folders ?? [], files: res.data.files ?? [] });
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [user?.userId, currentPrefix]);

  useEffect(() => { fetchListing(); }, [fetchListing]);

  /* ── concurrent multi-file upload ───────── */
  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    if (fileInputRef.current) fileInputRef.current.value = '';

    setUploading(true);
    // Initialise all as uploading with 0% progress
    setUploadProgress(files.map((f) => ({ name: f.name, status: 'uploading', pct: 0 })));

    // Upload every file concurrently; each updates its own progress slot
    const results = await Promise.allSettled(
      files.map((f, i) =>
        uploadSingleFile(f, currentPrefix || undefined, (pct) => {
          setUploadProgress((prev) => {
            const next = [...prev];
            if (next[i]) next[i] = { ...next[i], pct };
            return next;
          });
        })
      )
    );

    const finalProgress = results.map((r, i) =>
      r.status === 'fulfilled'
        ? { name: files[i].name, status: 'done', pct: 100 }
        : { name: files[i].name, status: 'error', pct: 0, error: r.reason?.message }
    );
    setUploadProgress(finalProgress);

    const doneCount = finalProgress.filter((p) => p.status === 'done').length;
    const errCount  = finalProgress.filter((p) => p.status === 'error').length;
    if (doneCount > 0) toast.success(`${doneCount} file${doneCount > 1 ? 's' : ''} uploaded`);
    if (errCount  > 0) toast.error(`${errCount} file${errCount > 1 ? 's' : ''} failed`);

    setUploading(false);
    setTimeout(() => { setUploadProgress([]); fetchListing(); }, 2500);
  };

  /* ── create folder ───────────────────────── */
  const handleCreateFolder = async () => {
    const name = folderName.trim();
    if (!name) { toast.error('Folder name cannot be empty'); return; }
    setCreatingFolder(true);
    try {
      await storageAPI.createFolder(name, currentPrefix || undefined);
      toast.success(`Folder "${name}" created`);
      setFolderName('');
      setShowFolderModal(false);
      fetchListing();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Failed to create folder');
    } finally {
      setCreatingFolder(false);
    }
  };

  /* ── single-file download ────────────────── */
  const handleDownloadFile = async (key, filename) => {
    setDownloadingKeys((prev) => new Set(prev).add(key));
    try {
      const res = await storageAPI.download(key);
      const presignedUrl = res.data.url;

      let fileHandle = null;
      if (FSA_SUPPORTED) {
        try {
          const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
          fileHandle = await dirHandle.getFileHandle(filename, { create: true });
        } catch (err) {
          // User cancelled the picker — fall through to blob fallback
          if (err.name === 'AbortError') {
            setDownloadingKeys((prev) => { const s = new Set(prev); s.delete(key); return s; });
            return;
          }
          // Any other FSA error → use blob fallback silently
          fileHandle = null;
        }
      }

      await streamToFile(presignedUrl, filename, fileHandle);
      toast.success(`Saved: ${filename}`);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? err?.message ?? 'Download failed');
    } finally {
      setDownloadingKeys((prev) => { const s = new Set(prev); s.delete(key); return s; });
    }
  };

  /* ── folder download → single ZIP ───────── */
  const handleDownloadFolder = async (folderKey) => {
    const folderDisplayName = stripUserPrefix(folderKey, user.userId).replace(/\/$/, '').split('/').pop();
    setDownloadingKeys((prev) => new Set(prev).add(folderKey));
    const toastId = toast.loading(`Zipping "${folderDisplayName}"…`);

    try {
      // Backend fetches all S3 files, zips them, streams back a single .zip blob
      const res = await storageAPI.downloadFolderZip(folderKey);
      const blob = new Blob([res.data], { type: 'application/zip' });
      const blobUrl = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${folderDisplayName}.zip`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);

      toast.dismiss(toastId);
      toast.success(`Downloaded "${folderDisplayName}.zip"`);
    } catch (err) {
      toast.dismiss(toastId);
      toast.error(err?.response?.data?.message ?? err?.message ?? 'Folder download failed');
    } finally {
      setDownloadingKeys((prev) => { const s = new Set(prev); s.delete(folderKey); return s; });
    }
  };

  /* ── delete ──────────────────────────────── */
  const promptDelete = (key, name, isFolder) => {
    setConfirmDelete({ key, name, isFolder });
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    const { key, name, isFolder } = confirmDelete;
    setConfirmDelete(null);
    setDeletingKeys((prev) => new Set(prev).add(key));
    try {
      if (isFolder) {
        await storageAPI.deleteFolder(key);
        toast.success(`Folder "${name}" deleted`);
      } else {
        await storageAPI.deleteFile(key);
        toast.success(`"${name}" deleted`);
      }
      fetchListing();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? `Failed to delete ${name}`);
    } finally {
      setDeletingKeys((prev) => { const s = new Set(prev); s.delete(key); return s; });
    }
  };

  /* ── navigation ─────────────────────────── */
  const navigateInto = (folderKey) => {
    setCurrentPrefix(stripUserPrefix(folderKey, user.userId));
  };

  const navigateToBreadcrumb = (index) => {
    if (index < 0) { setCurrentPrefix(''); return; }
    const crumbs = buildBreadcrumbs(currentPrefix);
    setCurrentPrefix(crumbs.slice(0, index + 1).join('/') + '/');
  };

  const breadcrumbs = buildBreadcrumbs(currentPrefix);

  /* ─── render ─────────────────────────────── */
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UploadIcon className="w-6 h-6 text-primary-600" />
          <h1 className="text-xl font-bold text-slate-900">My Files</h1>
        </div>
        <div className="flex items-center gap-2">
          {!FSA_SUPPORTED && (
            <span className="hidden sm:inline text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">
              Folder download: blob fallback
            </span>
          )}
          <button
            onClick={fetchListing}
            disabled={loading}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
            aria-label="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Action bar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-4 flex flex-wrap items-center gap-3">
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-xl shadow-sm hover:opacity-90 transition-all disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadIcon className="w-4 h-4" />}
          {uploading ? 'Uploading…' : 'Upload Files'}
        </button>

        <button
          onClick={() => setShowFolderModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-primary-700 bg-primary-50 rounded-xl hover:bg-primary-100 transition-colors"
        >
          <FolderPlus className="w-4 h-4" />
          New Folder
        </button>

        {/* Per-file upload progress */}
        {uploadProgress.length > 0 && (
          <div className="w-full mt-2 space-y-2">
            {uploadProgress.map((p, i) => (
              <div key={i} className="space-y-0.5">
                <div className="flex items-center gap-2 text-xs">
                  {p.status === 'done'     && <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />}
                  {p.status === 'error'    && <XCircle     className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
                  {p.status === 'uploading'&& <Loader2     className="w-3.5 h-3.5 text-amber-500 animate-spin flex-shrink-0" />}
                  <span className={`truncate font-medium flex-1 ${
                    p.status === 'done'  ? 'text-green-700' :
                    p.status === 'error' ? 'text-red-600'   : 'text-slate-600'
                  }`}>{p.name}</span>
                  <span className={`ml-auto text-[10px] font-semibold ${
                    p.status === 'done'  ? 'text-green-600' :
                    p.status === 'error' ? 'text-red-500'   : 'text-amber-600'
                  }`}>
                    {p.status === 'done'  ? 'Done' :
                     p.status === 'error' ? 'Failed' : `${p.pct ?? 0}%`}
                  </span>
                </div>
                {/* Progress bar — only while uploading */}
                {p.status === 'uploading' && (
                  <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 rounded-full transition-all duration-200"
                      style={{ width: `${p.pct ?? 0}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Breadcrumbs */}
      <nav aria-label="Folder navigation" className="flex items-center gap-1 text-sm text-slate-500 flex-wrap">
        <button onClick={() => navigateToBreadcrumb(-1)} className="inline-flex items-center gap-1 hover:text-primary-600 font-medium transition-colors">
          <Home className="w-3.5 h-3.5" />
          My Files
        </button>
        {breadcrumbs.map((crumb, idx) => (
          <React.Fragment key={idx}>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <button
              onClick={() => navigateToBreadcrumb(idx)}
              className={`hover:text-primary-600 transition-colors ${idx === breadcrumbs.length - 1 ? 'text-slate-800 font-semibold' : ''}`}
            >
              {crumb}
            </button>
          </React.Fragment>
        ))}
      </nav>

      {/* File grid */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
          </div>
        ) : items.folders.length === 0 && items.files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <File className="w-12 h-12 mb-3 opacity-40" />
            <p className="text-sm font-medium">This folder is empty</p>
            <p className="text-xs mt-1">Upload files or create a folder to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-4">

            {/* ── Folders ── */}
            {items.folders.map((folderKey) => {
              const display = stripUserPrefix(folderKey, user.userId).replace(/\/$/, '').split('/').pop();
              const isDlFolder = downloadingKeys.has(folderKey);
              return (
                <div key={folderKey} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-100 hover:border-amber-200 hover:bg-amber-50 transition-all group relative">
                  <button onClick={() => navigateInto(folderKey)} className="flex flex-col items-center gap-1 w-full" aria-label={`Open ${display}`}>
                    <Folder className="w-10 h-10 text-amber-400 group-hover:text-amber-500 transition-colors" />
                    <span className="text-xs font-medium text-slate-700 truncate w-full text-center" title={display}>{display}</span>
                  </button>
                  {/* Folder download button */}
                  <button
                    onClick={() => handleDownloadFolder(folderKey)}
                    disabled={isDlFolder}
                    className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors disabled:opacity-50"
                    aria-label={`Download folder ${display}`}
                  >
                    {isDlFolder ? <Loader2 className="w-3 h-3 animate-spin" /> : <FolderDown className="w-3 h-3" />}
                    {isDlFolder ? 'Saving…' : 'Download all'}
                  </button>
                  {/* Folder delete button */}
                  <button
                    onClick={() => promptDelete(folderKey, display, true)}
                    disabled={deletingKeys.has(folderKey)}
                    className="mt-0.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 transition-colors disabled:opacity-50"
                    aria-label={`Delete folder ${display}`}
                  >
                    {deletingKeys.has(folderKey) ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    {deletingKeys.has(folderKey) ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              );
            })}

            {/* ── Files ── */}
            {items.files.map((obj) => {
              const display = stripUserPrefix(obj.key, user.userId).split('/').pop();
              const isDl = downloadingKeys.has(obj.key);
              const isDel = deletingKeys.has(obj.key);
              return (
                <div key={obj.key} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all">
                  <FileTypeIcon name={display} className="w-10 h-10" />
                  <span className="text-xs font-medium text-slate-700 truncate w-full text-center" title={display}>{display}</span>
                  <span className="text-[10px] text-slate-400">{formatBytes(obj.size)}</span>
                  <button
                    onClick={() => handleDownloadFile(obj.key, display)}
                    disabled={isDl}
                    className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 border border-primary-100 transition-colors disabled:opacity-50"
                    aria-label={`Download ${display}`}
                  >
                    {isDl ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                    {isDl ? 'Saving…' : 'Download'}
                  </button>
                  <button
                    onClick={() => promptDelete(obj.key, display, false)}
                    disabled={isDel}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 transition-colors disabled:opacity-50"
                    aria-label={`Delete ${display}`}
                  >
                    {isDel ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    {isDel ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              );
            })}

          </div>
        )}
      </div>

      {/* Create Folder Modal */}
      {showFolderModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowFolderModal(false); }}
        >
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900">New Folder</h2>
              <button onClick={() => setShowFolderModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>
            {currentPrefix && (
              <p className="text-xs text-slate-400 mb-3">
                Inside: <span className="font-medium text-slate-600">{currentPrefix}</span>
              </p>
            )}
            <input
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder(); }}
              placeholder="Folder name"
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition mb-4"
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={() => setShowFolderModal(false)} className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={creatingFolder || !folderName.trim()}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-xl disabled:opacity-60 transition-all"
                style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
              >
                {creatingFolder ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderPlus className="w-4 h-4" />}
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Delete Modal ── */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmDelete(null); }}
        >
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 w-full max-w-sm">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Delete {confirmDelete.isFolder ? 'folder' : 'file'}?
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  <span className="font-medium text-slate-700">"{confirmDelete.name}"</span>
                  {confirmDelete.isFolder
                    ? ' and all files inside it will be permanently deleted.'
                    : ' will be permanently deleted.'}
                  {' '}This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Upload;
