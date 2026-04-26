import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import TransactionList from './TransactionList';

// Mock the wallet API
jest.mock('../../services/api', () => ({
  walletAPI: {
    getTransactions: jest.fn(),
  },
}));

const { walletAPI } = require('../../services/api');

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, cacheTime: 0 } },
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const mockTransactions = [
  {
    _id: 'tx1',
    userId: 'user1',
    amount: 5,
    eventType: 'engagement_earned',
    relatedPostId: 'post123abc',
    createdAt: new Date().toISOString(),
  },
  {
    _id: 'tx2',
    userId: 'user1',
    amount: -100,
    eventType: 'conversion',
    relatedPostId: null,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    _id: 'tx3',
    userId: 'user1',
    amount: 3,
    eventType: 'engagement_received',
    relatedPostId: 'post456def',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
  },
];

describe('TransactionList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    walletAPI.getTransactions.mockReturnValue(new Promise(() => {}));
    render(<TransactionList />, { wrapper: createWrapper() });
    expect(screen.getByText('Transaction History')).toBeInTheDocument();
  });

  it('renders empty state when no transactions', async () => {
    walletAPI.getTransactions.mockResolvedValue({
      data: { transactions: [], total: 0, page: 1, totalPages: 1 },
    });
    render(<TransactionList />, { wrapper: createWrapper() });
    expect(
      await screen.findByText('No transactions yet. Start engaging to earn coins!')
    ).toBeInTheDocument();
  });

  it('renders transactions with correct labels and amounts', async () => {
    walletAPI.getTransactions.mockResolvedValue({
      data: { transactions: mockTransactions, total: 3, page: 1, totalPages: 1 },
    });
    render(<TransactionList />, { wrapper: createWrapper() });

    expect(await screen.findByText('Engagement Earned')).toBeInTheDocument();
    expect(screen.getByText('Conversion')).toBeInTheDocument();
    expect(screen.getByText('Engagement Received')).toBeInTheDocument();

    // Positive amounts show with +
    expect(screen.getByText('+5')).toBeInTheDocument();
    expect(screen.getByText('+3')).toBeInTheDocument();
    // Negative amounts show without +
    expect(screen.getByText('-100')).toBeInTheDocument();
  });

  it('shows positive amounts in green and negative in red', async () => {
    walletAPI.getTransactions.mockResolvedValue({
      data: { transactions: mockTransactions, total: 3, page: 1, totalPages: 1 },
    });
    render(<TransactionList />, { wrapper: createWrapper() });

    const positiveAmount = await screen.findByText('+5');
    expect(positiveAmount).toHaveClass('text-emerald-600');

    const negativeAmount = screen.getByText('-100');
    expect(negativeAmount).toHaveClass('text-red-500');
  });

  it('displays truncated post ID for transactions with relatedPostId', async () => {
    walletAPI.getTransactions.mockResolvedValue({
      data: { transactions: mockTransactions, total: 3, page: 1, totalPages: 1 },
    });
    render(<TransactionList />, { wrapper: createWrapper() });

    // post123abc -> last 6 chars = "23abc" wait, slice(-6) = "123abc" wait no, "post123abc".slice(-6) = "23abc" no...
    // "post123abc" has 10 chars, slice(-6) = "23abc" wait let me count: p-o-s-t-1-2-3-a-b-c = 10 chars, slice(-6) = "3abc" no...
    // Actually: indices 0-9, slice(-6) = indices 4-9 = "123abc" wait: 10-6=4, so chars at 4,5,6,7,8,9 = 1,2,3,a,b,c = "123abc"
    expect(await screen.findByText('Post: 123abc')).toBeInTheDocument();
  });

  it('shows total transaction count', async () => {
    walletAPI.getTransactions.mockResolvedValue({
      data: { transactions: mockTransactions, total: 3, page: 1, totalPages: 1 },
    });
    render(<TransactionList />, { wrapper: createWrapper() });
    expect(await screen.findByText('3 transactions')).toBeInTheDocument();
  });

  it('renders pagination controls when multiple pages exist', async () => {
    walletAPI.getTransactions.mockResolvedValue({
      data: { transactions: mockTransactions, total: 25, page: 1, totalPages: 3 },
    });
    render(<TransactionList />, { wrapper: createWrapper() });

    expect(await screen.findByText('Page 1 of 3')).toBeInTheDocument();
    expect(screen.getByLabelText('Previous page')).toBeDisabled();
    expect(screen.getByLabelText('Next page')).not.toBeDisabled();
  });

  it('navigates to next page when Next is clicked', async () => {
    walletAPI.getTransactions.mockResolvedValue({
      data: { transactions: mockTransactions, total: 25, page: 1, totalPages: 3 },
    });
    render(<TransactionList />, { wrapper: createWrapper() });

    await screen.findByText('Page 1 of 3');
    fireEvent.click(screen.getByLabelText('Next page'));

    // Should call API with page 2
    expect(walletAPI.getTransactions).toHaveBeenCalledWith(2, 10);
  });

  it('hides pagination when only one page', async () => {
    walletAPI.getTransactions.mockResolvedValue({
      data: { transactions: mockTransactions, total: 3, page: 1, totalPages: 1 },
    });
    render(<TransactionList />, { wrapper: createWrapper() });

    await screen.findByText('Engagement Earned');
    expect(screen.queryByText('Page 1 of 1')).not.toBeInTheDocument();
  });

  it('renders error state', async () => {
    walletAPI.getTransactions.mockRejectedValue(new Error('Network error'));
    render(<TransactionList />, { wrapper: createWrapper() });

    expect(
      await screen.findByText('Unable to load transactions. Please try again later.')
    ).toBeInTheDocument();
  });
});
