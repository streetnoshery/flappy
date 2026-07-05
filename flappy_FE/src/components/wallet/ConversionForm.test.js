import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import ConversionForm from './ConversionForm';
import toast from 'react-hot-toast';

// Mock the wallet API
jest.mock('../../services/api', () => ({
  walletAPI: {
    getThresholds: jest.fn(),
    requestConversion: jest.fn(),
  },
}));

jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
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

const mockThresholds = {
  coinThreshold: 100,
  engagementThreshold: 10,
  conversionRate: 50,
};

describe('ConversionForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    walletAPI.getThresholds.mockResolvedValue({ data: mockThresholds });
  });

  it('renders loading state while fetching thresholds', () => {
    walletAPI.getThresholds.mockReturnValue(new Promise(() => {}));
    render(<ConversionForm balance={200} engagementCount={15} />, {
      wrapper: createWrapper(),
    });
    expect(screen.getByText('Convert Coins')).toBeInTheDocument();
  });

  it('displays progress bars for both thresholds', async () => {
    render(<ConversionForm balance={50} engagementCount={5} />, {
      wrapper: createWrapper(),
    });

    expect(await screen.findByText('Coin Threshold')).toBeInTheDocument();
    expect(screen.getByText('Engagement Threshold')).toBeInTheDocument();
    expect(screen.getByText('50 / 100')).toBeInTheDocument();
    expect(screen.getByText('5 / 10')).toBeInTheDocument();
  });

  it('shows error message when coin threshold is not met', async () => {
    render(<ConversionForm balance={50} engagementCount={15} />, {
      wrapper: createWrapper(),
    });

    expect(
      await screen.findByText(/You need at least 100 coins to convert/)
    ).toBeInTheDocument();
  });

  it('shows error message when engagement threshold is not met', async () => {
    render(<ConversionForm balance={200} engagementCount={5} />, {
      wrapper: createWrapper(),
    });

    expect(
      await screen.findByText(/You need at least 10 engagements/)
    ).toBeInTheDocument();
  });

  it('shows combined error when both thresholds are not met', async () => {
    render(<ConversionForm balance={50} engagementCount={5} />, {
      wrapper: createWrapper(),
    });

    expect(
      await screen.findByText(/You need at least 100 coins and 10 engagements/)
    ).toBeInTheDocument();
  });

  it('disables input and button when thresholds are not met', async () => {
    render(<ConversionForm balance={50} engagementCount={5} />, {
      wrapper: createWrapper(),
    });

    const input = await screen.findByLabelText('Amount to convert');
    const button = screen.getByRole('button', { name: /convert coins/i });

    expect(input).toBeDisabled();
    expect(button).toBeDisabled();
  });

  it('enables input and button when thresholds are met', async () => {
    render(<ConversionForm balance={200} engagementCount={15} />, {
      wrapper: createWrapper(),
    });

    const input = await screen.findByLabelText('Amount to convert');
    expect(input).not.toBeDisabled();
  });

  it('shows payout estimate when amount is entered and thresholds met', async () => {
    render(<ConversionForm balance={200} engagementCount={15} />, {
      wrapper: createWrapper(),
    });

    const input = await screen.findByLabelText('Amount to convert');
    fireEvent.change(input, { target: { value: '100' } });

    // 100 coins / 50 rate = $2.00
    expect(screen.getByText('≈ $2.00 payout')).toBeInTheDocument();
  });

  it('submits conversion request on form submit', async () => {
    walletAPI.requestConversion.mockResolvedValue({ data: { success: true } });

    render(<ConversionForm balance={200} engagementCount={15} />, {
      wrapper: createWrapper(),
    });

    const input = await screen.findByLabelText('Amount to convert');
    fireEvent.change(input, { target: { value: '100' } });

    const button = screen.getByRole('button', { name: /convert coins/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(walletAPI.requestConversion).toHaveBeenCalledWith(100);
    });

    expect(toast.success).toHaveBeenCalledWith(
      'Conversion request submitted successfully!'
    );
  });

  it('shows error toast when conversion fails', async () => {
    walletAPI.requestConversion.mockRejectedValue({
      response: { data: { message: 'Insufficient coin balance. Minimum required: 100' } },
    });

    render(<ConversionForm balance={200} engagementCount={15} />, {
      wrapper: createWrapper(),
    });

    const input = await screen.findByLabelText('Amount to convert');
    fireEvent.change(input, { target: { value: '100' } });

    const button = screen.getByRole('button', { name: /convert coins/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Insufficient coin balance. Minimum required: 100'
      );
    });
  });

  it('shows validation error for invalid amount', async () => {
    render(<ConversionForm balance={200} engagementCount={15} />, {
      wrapper: createWrapper(),
    });

    const input = await screen.findByLabelText('Amount to convert');
    fireEvent.change(input, { target: { value: '0' } });

    const button = screen.getByRole('button', { name: /convert coins/i });
    fireEvent.click(button);

    expect(toast.error).toHaveBeenCalledWith(
      'Please enter a valid conversion amount.'
    );
    expect(walletAPI.requestConversion).not.toHaveBeenCalled();
  });

  it('shows validation error when amount exceeds balance', async () => {
    render(<ConversionForm balance={200} engagementCount={15} />, {
      wrapper: createWrapper(),
    });

    const input = await screen.findByLabelText('Amount to convert');
    fireEvent.change(input, { target: { value: '500' } });

    const button = screen.getByRole('button', { name: /convert coins/i });
    fireEvent.click(button);

    expect(toast.error).toHaveBeenCalledWith(
      'Conversion amount exceeds your current balance.'
    );
    expect(walletAPI.requestConversion).not.toHaveBeenCalled();
  });

  it('hides threshold warning when both thresholds are met', async () => {
    render(<ConversionForm balance={200} engagementCount={15} />, {
      wrapper: createWrapper(),
    });

    await screen.findByText('Coin Threshold');

    expect(screen.queryByText(/You need at least/)).not.toBeInTheDocument();
  });
});
