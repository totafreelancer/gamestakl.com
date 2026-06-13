/**
 * Tournaments Page
 * Delegates to the new TournamentList component which includes
 * game filter tabs, search, status filter, card grid, and the
 * JoinTournamentModal with manual payment flow.
 */
import TournamentList from '../components/TournamentList'

const Tournaments = () => {
  return <TournamentList />
}

export default Tournaments
