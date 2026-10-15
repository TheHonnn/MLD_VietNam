import { apiClient } from './apiClient';
import { mockCustomers } from './mockData';
import { User, MemberTier, ApiResponse } from '../types/shared_types';

export const customerService = {
  async getCustomers(query?: { search?: string; tier?: MemberTier }): Promise<ApiResponse<User[]>> {
    return apiClient.get<User[]>('/customers', {
      params: query,
      mockFallback: () => {
        let result = [...mockCustomers];
        if (query?.search) {
          const s = query.search.toLowerCase();
          result = result.filter(
            (c) =>
              c.fullName.toLowerCase().includes(s) ||
              c.phone.includes(s) ||
              c.referralCode.toLowerCase().includes(s)
          );
        }
        if (query?.tier) {
          result = result.filter((c) => c.membershipTier === query.tier);
        }
        return result;
      },
    });
  },

  async getCustomerById(id: string): Promise<ApiResponse<User | undefined>> {
    return apiClient.get<User | undefined>(`/customers/${id}`, {
      mockFallback: () => mockCustomers.find((c) => c.id === id),
    });
  },

  async updateCustomerTier(id: string, tier: MemberTier): Promise<ApiResponse<User>> {
    return apiClient.patch<User>(`/customers/${id}/tier`, {
      membershipTier: tier,
    }, {
      mockFallback: () => {
        const customer = mockCustomers.find((c) => c.id === id);
        if (customer) {
          customer.membershipTier = tier;
        }
        return customer;
      },
    });
  },
};
