# Frontend Patterns — flappy_FE

## Adding a New API Call
All API calls live in `src/services/api.js`. Add to the relevant group:

```javascript
// In src/services/api.js
export const myFeatureAPI = {
  getAll: (page = 1, pageSize = 20) =>
    api.get(`/myfeature?page=${page}&pageSize=${pageSize}`),
  getOne: (id) => api.get(`/myfeature/${id}`),
  create: (data) => api.post('/myfeature', data),
  update: (id, data) => api.put(`/myfeature/${id}`, data),
  delete: (id) => api.delete(`/myfeature/${id}`),
};
```

The axios instance automatically:
- Attaches `Authorization: Bearer <token>` from localStorage
- Redirects to `/login` on 401

## Fetching Data (useQuery)
```javascript
import { useQuery } from 'react-query';
import { myFeatureAPI } from '../services/api';

const MyComponent = () => {
  const { data, isLoading, isError } = useQuery(
    ['myFeature', someId],       // cache key — array for parameterized queries
    () => myFeatureAPI.getOne(someId),
    {
      enabled: !!someId,         // only fetch when someId exists
      staleTime: 30000,          // ms before refetch
      keepPreviousData: true,    // for pagination
    }
  );

  const items = data?.data?.items ?? [];  // always use ?. and ?? fallback
};
```

## Mutations (useMutation)
```javascript
import { useMutation, useQueryClient } from 'react-query';

const queryClient = useQueryClient();

const createMutation = useMutation(
  (formData) => myFeatureAPI.create(formData),
  {
    onSuccess: () => {
      toast.success('Created!');
      queryClient.invalidateQueries('myFeature'); // refresh related queries
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Something went wrong';
      toast.error(msg);
    },
  }
);

// Call it:
createMutation.mutate({ name: 'test' });
createMutation.isLoading  // true while pending
```

## Getting Current User
```javascript
import { useAuth } from '../contexts/AuthContext';

const { user } = useAuth();
const userId = user?.userId;           // custom string ID
const isOwnContent = user?.userId === content.userId?.userId;
```

## New Page Component Pattern
```javascript
import React from 'react';
import { useQuery } from 'react-query';
import { useAuth } from '../contexts/AuthContext';
import { myFeatureAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const MyPage = () => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery(
    ['myData', user?.userId],
    () => myFeatureAPI.getAll(),
    { enabled: !!user?.userId }
  );

  if (isLoading) return <div className="flex justify-center py-20"><LoadingSpinner /></div>;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
      <h1 className="text-xl font-bold text-slate-900">My Page</h1>
      {/* content */}
    </div>
  );
};

export default MyPage;
```

## Adding a Route
In `src/App.js`, add inside the `<Routes>` block:
```javascript
import MyPage from './pages/MyPage';

// Inside Routes:
<Route path="/mypage" element={<ProtectedRoute><MyPage /></ProtectedRoute>} />
```

## Adding to Navigation
In `src/components/Sidebar.js`, add to `menuItems`:
```javascript
import { MyIcon } from 'lucide-react';

{ icon: MyIcon, label: 'My Feature', path: '/mypage' },
```

Also add to `BottomNav` in `src/components/Layout.js` for mobile.

## Tailwind CSS Conventions
```javascript
// Card container
<div className="bg-white rounded-2xl shadow-card p-6 border border-slate-100">

// Section header
<div className="flex items-center gap-2 text-slate-500 text-sm font-medium mb-4">
  <Icon className="w-4 h-4 text-amber-500" />
  <span>Section Title</span>
</div>

// Primary button
<button className="px-4 py-2 text-sm font-semibold text-white rounded-xl"
  style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
  Action
</button>

// Amber/coin button
<button style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
  Convert
</button>

// Empty state
<p className="text-sm text-slate-400 text-center py-6">
  Nothing here yet.
</p>

// Loading spinner (inline)
<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500" />
```

## Pagination Component Pattern
```javascript
const [page, setPage] = useState(1);
const ITEMS_PER_PAGE = 10;

// In query:
() => myAPI.getAll(page, ITEMS_PER_PAGE)

// Pagination controls:
<div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
    className="flex items-center gap-1 text-xs font-medium text-slate-500 disabled:opacity-30">
    <ChevronLeft className="w-4 h-4" /> Previous
  </button>
  <span className="text-xs text-slate-400">Page {page} of {totalPages}</span>
  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
    className="flex items-center gap-1 text-xs font-medium text-slate-500 disabled:opacity-30">
    Next <ChevronRight className="w-4 h-4" />
  </button>
</div>
```

## Owner-Only UI Pattern
```javascript
const { user } = useAuth();
const isOwner = user?.userId === post.userId?.userId;

// Only render for owner:
{isOwner && (
  <div>Only you can see this</div>
)}
```

## Feature Flags
```javascript
import { useFeatureFlags } from '../contexts/FeatureFlagsContext';

const { isFeatureEnabled } = useFeatureFlags();

{isFeatureEnabled('enableShare') && <ShareButton />}
```
