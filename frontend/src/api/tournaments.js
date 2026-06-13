import apiClient from './axiosConfig'

export const tournamentService = {
  // Tournaments
  getTournaments: async (filters = {}) => {
    try {
      const params = new URLSearchParams()
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null) {
          params.append(key, filters[key])
        }
      })
      
      const response = await apiClient.get('/tournaments/', { params })
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch tournaments' }
    }
  },

  getTournament: async (tournamentId) => {
    try {
      const response = await apiClient.get(`/tournaments/${tournamentId}/`)
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch tournament' }
    }
  },

  createTournament: async (tournamentData) => {
    try {
      const response = await apiClient.post('/tournaments/', tournamentData)
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to create tournament' }
    }
  },

  updateTournament: async (tournamentId, tournamentData) => {
    try {
      const response = await apiClient.patch(`/tournaments/${tournamentId}/`, tournamentData)
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to update tournament' }
    }
  },

  deleteTournament: async (tournamentId) => {
    try {
      const response = await apiClient.delete(`/tournaments/${tournamentId}/`)
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to delete tournament' }
    }
  },

  joinTournament: async (tournamentId, paymentGateway = 'mock', inGameId = '') => {
    try {
      const payload = { payment_gateway: paymentGateway }
      if (inGameId) payload.in_game_id = inGameId
      const response = await apiClient.post(`/tournaments/${tournamentId}/join/`, payload)
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to join tournament' }
    }
  },

  // Manual payment proof upload
  submitManualPaymentProof: async (participantId, formData) => {
    try {
      const response = await apiClient.post(`/tournaments/participants/${participantId}/submit_manual_payment_proof/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to submit payment proof' }
    }
  },

  // Get manual payment status
  getManualPaymentStatus: async (participantId) => {
    try {
      const response = await apiClient.get(`/tournaments/participants/${participantId}/get_manual_payment_status/`)
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to get payment status' }
    }
  },

  // Admin actions
  approveManualPayment: async (participantId) => {
    try {
      const response = await apiClient.post(`/tournaments/participants/${participantId}/approve_manual_payment/`)
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to approve payment' }
    }
  },

  rejectManualPayment: async (participantId, reason = '') => {
    try {
      const response = await apiClient.post(`/tournaments/participants/${participantId}/reject_manual_payment/`, { rejection_reason: reason })
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to reject payment' }
    }
  },

  verifyPayment: async (participantId, transactionId) => {
    try {
      const response = await apiClient.post(`/tournaments/participants/${participantId}/verify-payment/`, { transaction_id: transactionId })
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to verify payment' }
    }
  },

  generateBracket: async (tournamentId) => {
    try {
      const response = await apiClient.post(`/tournaments/${tournamentId}/bracket/generate/`)
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to generate bracket' }
    }
  },

  getBracket: async (tournamentId) => {
    try {
      const response = await apiClient.get(`/tournaments/${tournamentId}/bracket/`)
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch bracket' }
    }
  },

  // Participants
  getParticipants: async (filters = {}) => {
    try {
      const params = new URLSearchParams()
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null) {
          params.append(key, filters[key])
        }
      })
      
      const response = await apiClient.get('/tournaments/participants/', { params })
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch participants' }
    }
  },

  getParticipant: async (participantId) => {
    try {
      const response = await apiClient.get(`/tournaments/participants/${participantId}/`)
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch participant' }
    }
  },

  // Matches
  getMatches: async (filters = {}) => {
    try {
      const params = new URLSearchParams()
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null) {
          params.append(key, filters[key])
        }
      })
      
      const response = await apiClient.get('/tournaments/matches/', { params })
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch matches' }
    }
  },

  getMatch: async (matchId) => {
    try {
      const response = await apiClient.get(`/tournaments/matches/${matchId}/`)
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch match' }
    }
  },

  updateMatchScore: async (matchId, scoreData) => {
    try {
      const response = await apiClient.post(`/tournaments/matches/${matchId}/score/`, scoreData)
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to update match score' }
    }
  },

  // Stats and utilities
  getTournamentStats: async () => {
    try {
      const response = await apiClient.get('/tournaments/stats/')
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch tournament stats' }
    }
  },

  getUpcomingTournaments: async () => {
    try {
      const response = await apiClient.get('/tournaments/upcoming/')
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch upcoming tournaments' }
    }
  },

  // ══════════════════════════════════════════════════════════════
  // Manual Payment Registration (new primary flow)
  // ══════════════════════════════════════════════════════════════


  /**
   * Create a manual payment tournament registration (flat endpoint).
   * POST /api/tournaments/registrations/
   * @param {Object} registrationData - { tournament, team_name, player_game_ids, payment_method, sender_number, transaction_id }
   */
  createRegistration: async (registrationData) => {
    try {
      const response = await apiClient.post(
        '/tournaments/registrations/',
        registrationData
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to create registration' };
    }
  },

  /**
   * Register for a tournament with manual payment.
   * @param {number} tournamentId
   * @param {Object} registrationData - { team_name, player_game_ids, payment_method, sender_number, transaction_id }
   */
  registerForTournament: async (tournamentId, registrationData) => {
    try {
      const response = await apiClient.post(
        `/tournaments/${tournamentId}/register/`,
        registrationData
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to register for tournament' };
    }
  },

  /**
   * Get the current user's registration & payment status for a tournament.
   * @param {number} tournamentId
   */
  getMyRegistrationStatus: async (tournamentId) => {
    try {
      const response = await apiClient.get(
        `/tournaments/${tournamentId}/my-status/`
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch registration status' };
    }
  },

  // ══════════════════════════════════════════════════════════════
  // Admin: Manage Registrations
  // ══════════════════════════════════════════════════════════════

  /**
   * Admin: List all pending registrations.
   */
  adminGetPendingRegistrations: async () => {
    try {
      const response = await apiClient.get('/tournaments/admin/registrations/pending/');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch pending registrations' };
    }
  },

  /**
   * Admin: Approve a registration.
   * @param {number} registrationId
   */
  adminApproveRegistration: async (registrationId) => {
    try {
      const response = await apiClient.post(
        `/tournaments/admin/registrations/${registrationId}/approve/`
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to approve registration' };
    }
  },

  /**
   * Admin: Reject a registration.
   * @param {number} registrationId
   * @param {string} reason - Rejection reason
   */
  adminRejectRegistration: async (registrationId, reason = '') => {
    try {
      const response = await api.post(
        `/tournaments/admin/registrations/${registrationId}/reject/`,
        { rejection_reason: reason }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to reject registration' };
    }
  },
}