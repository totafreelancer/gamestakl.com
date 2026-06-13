import math
from datetime import datetime, timedelta
from .models import Tournament, TournamentMatch, TournamentParticipant


class TournamentBracketGenerator:
    def __init__(self, tournament):
        self.tournament = tournament
        self.participants = list(tournament.participants.all())
        self.matches = []
    
    def generate_single_elimination_bracket(self):
        if not self.tournament.is_full:
            raise ValueError("Tournament is not full yet")
        
        num_participants = len(self.participants)
        if num_participants < 2:
            raise ValueError("Not enough participants")
        
        # Calculate number of rounds
        num_rounds = int(math.log2(num_participants))
        
        # Generate matches for each round
        current_round_participants = self.participants.copy()
        
        for round_num in range(num_rounds):
            round_name = self._get_round_name(round_num, num_rounds)
            match_number = 1
            
            # Create matches for current round
            next_round_participants = []
            
            for i in range(0, len(current_round_participants), 2):
                participant1 = current_round_participants[i]
                participant2 = current_round_participants[i + 1] if i + 1 < len(current_round_participants) else None
                
                match = TournamentMatch.objects.create(
                    tournament=self.tournament,
                    round=round_name,
                    match_number=match_number,
                    participant1=participant1,
                    participant2=participant2,
                    scheduled_time=self._calculate_match_time(round_num)
                )
                
                self.matches.append(match)
                next_round_participants.append(match)
                match_number += 1
            
            current_round_participants = next_round_participants
        
        return self.matches
    
    def _get_round_name(self, round_num, total_rounds):
        if round_num == total_rounds - 1:
            return 'FINAL'
        elif round_num == total_rounds - 2:
            return 'SEMI_FINAL'
        elif round_num == total_rounds - 3:
            return 'QUARTER_FINAL'
        else:
            return f'ROUND_OF_{2**(total_rounds - round_num)}'
    
    def _calculate_match_time(self, round_num):
        # Schedule matches with some time between rounds
        base_time = self.tournament.start_time
        time_between_rounds = timedelta(hours=2)  # 2 hours between rounds
        return base_time + (round_num * time_between_rounds)
    
    def get_next_match(self, participant):
        # Find the next match for a participant
        for match in self.matches:
            if match.participant1 == participant and match.status == 'PENDING':
                return match
            elif match.participant2 == participant and match.status == 'PENDING':
                return match
        return None
    
    def get_participant_matches(self, participant):
        # Get all matches for a participant
        return [match for match in self.matches 
                if match.participant1 == participant or match.participant2 == participant]
    
    def get_bracket_structure(self):
        # Return bracket structure for display
        structure = {}
        for match in self.matches:
            if match.round not in structure:
                structure[match.round] = []
            structure[match.round].append({
                'match_number': match.match_number,
                'participant1': match.participant1.gamer.username if match.participant1 else None,
                'participant2': match.participant2.gamer.username if match.participant2 else None,
                'score1': match.score1,
                'score2': match.score2,
                'winner': match.winner.gamer.username if match.winner else None,
                'status': match.status
            })
        return structure


def auto_generate_bracket(tournament_id):
    try:
        tournament = Tournament.objects.get(id=tournament_id)
        if not tournament.is_full:
            return False, "Tournament is not full yet"
        
        generator = TournamentBracketGenerator(tournament)
        matches = generator.generate_single_elimination_bracket()
        
        return True, f"Generated {len(matches)} matches for tournament"
    
    except Tournament.DoesNotExist:
        return False, "Tournament not found"
    except Exception as e:
        return False, str(e)


def get_tournament_bracket(tournament_id):
    try:
        tournament = Tournament.objects.get(id=tournament_id)
        generator = TournamentBracketGenerator(tournament)
        return generator.get_bracket_structure()
    except Tournament.DoesNotExist:
        return None