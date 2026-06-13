import apiClient from './axiosConfig';

const API_URL = '/admin/';

// Dashboard Stats
export const getDashboardStats = () => {
  return apiClient.get(`${API_URL}stats/`);
};

export const getRecentActivity = () => {
  return apiClient.get(`${API_URL}activity/`);
};

// User Management
export const getUsers = (params = {}) => {
  return apiClient.get(`${API_URL}users/`, { params });
};

export const getUserDetails = (userId) => {
  return apiClient.get(`${API_URL}users/${userId}/`);
};

export const banUser = (userId) => {
  return apiClient.post(`${API_URL}users/${userId}/ban/`);
};

export const unbanUser = (userId) => {
  return apiClient.post(`${API_URL}users/${userId}/unban/`);
};

export const promoteUser = (userId) => {
  return apiClient.post(`${API_URL}users/${userId}/promote/`);
};

export const demoteUser = (userId) => {
  return apiClient.post(`${API_URL}users/${userId}/demote/`);
};

export const deleteUser = (userId) => {
  return apiClient.delete(`${API_URL}users/${userId}/delete_user/`);
};

// Add points to a user's GamerProfile (admin action)
export const addPoints = (userId, amount) => {
  return apiClient.post(`${API_URL}users/${userId}/add_points/`, { amount });
};

// Content Management
export const getPosts = (params = {}) => {
  return apiClient.get(`${API_URL}content/posts/`, { params });
};

export const approvePost = (postId) => {
  return apiClient.post(`${API_URL}content/approve_post/`, { post_id: postId });
};

export const rejectPost = (postId) => {
  return apiClient.post(`${API_URL}content/reject_post/`, { post_id: postId });
};

export const getComments = (params = {}) => {
  return apiClient.get(`${API_URL}content/comments/`, { params });
};

export const approveComment = (commentId) => {
  return apiClient.post(`${API_URL}content/approve_comment/`, { comment_id: commentId });
};

export const deleteComment = (commentId) => {
  return apiClient.delete(`${API_URL}content/delete_comment/`, {
    params: { comment_id: commentId }
  });
};

// Tournament Management
export const getAdminTournaments = (params = {}) => {
  return apiClient.get(`${API_URL}tournaments/`, { params });
};

export const getAdminTournamentDetails = (tournamentId) => {
  return apiClient.get(`${API_URL}tournaments/${tournamentId}/`);
};

export const createTournament = (data) => {
  return apiClient.post(`${API_URL}tournaments/`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const updateTournament = (tournamentId, data) => {
  return apiClient.patch(`${API_URL}tournaments/${tournamentId}/`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const startTournament = (tournamentId) => {
  return apiClient.post(`${API_URL}tournaments/${tournamentId}/start/`);
};

export const completeTournament = (tournamentId) => {
  return apiClient.post(`${API_URL}tournaments/${tournamentId}/complete/`);
};

export const cancelTournament = (tournamentId) => {
  return apiClient.post(`${API_URL}tournaments/${tournamentId}/cancel/`);
};

export const deleteTournament = (tournamentId) => {
  return apiClient.delete(`${API_URL}tournaments/${tournamentId}/delete_tournament/`);
};

export const getTournamentParticipants = (tournamentId, params = {}) => {
  return apiClient.get(`${API_URL}tournaments/${tournamentId}/participants/`, { params });
};

// ══════════════════════════════════════════════════════════════
// Manual Payment Registration Management (new primary flow)
// ══════════════════════════════════════════════════════════════

/**
 * List all manual payment registrations for a tournament.
 * GET /admin/tournaments/{id}/registrations/
 * @param {number} tournamentId
 * @param {Object} params - { search, payment_status, page, page_size }
 */
export const getTournamentRegistrations = (tournamentId, params = {}) => {
  return apiClient.get(`${API_URL}tournaments/${tournamentId}/registrations/`, { params });
};

/**
 * Approve a tournament registration (admin only).
 * Uses the TournamentRegistrationViewSet's approve_participant action.
 * POST /api/tournaments/registrations/{id}/approve_participant/
 * @param {number} registrationId
 */
export const approveRegistration = (registrationId) => {
  return apiClient.post(`/tournaments/registrations/${registrationId}/approve_participant/`);
};

/**
 * Reject a tournament registration (admin only).
 * Uses the TournamentRegistrationViewSet's reject_participant action.
 * POST /api/tournaments/registrations/{id}/reject_participant/
 * @param {number} registrationId
 * @param {string} rejectionReason
 */
export const rejectRegistration = (registrationId, rejectionReason = '') => {
  return apiClient.post(
    `/tournaments/registrations/${registrationId}/reject_participant/`,
    { rejection_reason: rejectionReason }
  );
};
