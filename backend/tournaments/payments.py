import requests
import json
import uuid
from datetime import datetime
from decimal import Decimal
from django.conf import settings
from .models import TournamentParticipant


class MockPaymentGateway:
    """Mock payment gateway for testing purposes"""
    
    def __init__(self):
        self.base_url = "https://mock-payment-api.example.com"
        self.api_key = "mock_api_key_12345"
    
    def create_payment(self, amount, currency, description, customer_info):
        """Create a payment transaction"""
        try:
            # Simulate API call
            transaction_id = str(uuid.uuid4())
            
            # Simulate different responses
            import random
            if random.random() < 0.1:  # 10% chance of failure
                return {
                    'success': False,
                    'message': 'Payment failed',
                    'transaction_id': None
                }
            
            return {
                'success': True,
                'message': 'Payment created successfully',
                'transaction_id': transaction_id,
                'payment_url': f"{self.base_url}/payment/{transaction_id}"
            }
        
        except Exception as e:
            return {
                'success': False,
                'message': f'Payment gateway error: {str(e)}',
                'transaction_id': None
            }
    
    def verify_payment(self, transaction_id):
        """Verify payment status"""
        try:
            # Simulate API call
            import random
            if random.random() < 0.05:  # 5% chance of verification failure
                return {
                    'success': False,
                    'message': 'Verification failed',
                    'status': 'FAILED'
                }
            
            return {
                'success': True,
                'message': 'Payment verified successfully',
                'status': 'PAID',
                'amount': Decimal('50.00'),  # Mock amount
                'currency': 'BDT'
            }
        
        except Exception as e:
            return {
                'success': False,
                'message': f'Verification error: {str(e)}',
                'status': 'FAILED'
            }


class ShurjopayGateway:
    """Shurjopay payment gateway integration"""
    
    def __init__(self):
        self.base_url = "https://api.shurjopay.com"
        self.api_key = settings.SHURJOPAY_API_KEY
        self.store_id = settings.SHURJOPAY_STORE_ID
    
    def create_payment(self, amount, currency, description, customer_info):
        """Create a payment transaction"""
        try:
            payload = {
                'store_id': self.store_id,
                'store_password': self.api_key,
                'total_amount': str(amount),
                'currency': currency,
                'tran_id': str(uuid.uuid4()),
                'success_url': f"{settings.FRONTEND_URL}/payment/success/",
                'fail_url': f"{settings.FRONTEND_URL}/payment/fail/",
                'cancel_url': f"{settings.FRONTEND_URL}/payment/cancel/",
                'desc': description,
                'cus_name': customer_info.get('name', ''),
                'cus_email': customer_info.get('email', ''),
                'cus_add1': customer_info.get('address', ''),
                'cus_phone': customer_info.get('phone', ''),
                'product_name': description,
                'product_category': 'Gaming',
                'product_profile': 'non-physical-goods'
            }
            
            headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
            
            response = requests.post(
                f"{self.base_url}/api/create_payment",
                json=payload,
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get('status') == 'success':
                    return {
                        'success': True,
                        'message': 'Payment created successfully',
                        'transaction_id': result.get('payment_id'),
                        'payment_url': result.get('payment_url')
                    }
                else:
                    return {
                        'success': False,
                        'message': result.get('message', 'Payment creation failed'),
                        'transaction_id': None
                    }
            else:
                return {
                    'success': False,
                    'message': f'API error: {response.status_code}',
                    'transaction_id': None
                }
        
        except Exception as e:
            return {
                'success': False,
                'message': f'Payment gateway error: {str(e)}',
                'transaction_id': None
            }
    
    def verify_payment(self, transaction_id):
        """Verify payment status"""
        try:
            payload = {
                'store_id': self.store_url,
                'store_password': self.api_key,
                'payment_id': transaction_id
            }
            
            headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
            
            response = requests.post(
                f"{self.base_url}/api/verify_payment",
                json=payload,
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get('status') == 'success':
                    return {
                        'success': True,
                        'message': 'Payment verified successfully',
                        'status': result.get('payment_status'),
                        'amount': Decimal(result.get('amount', '0')),
                        'currency': result.get('currency', 'BDT')
                    }
                else:
                    return {
                        'success': False,
                        'message': result.get('message', 'Verification failed'),
                        'status': 'FAILED'
                    }
            else:
                return {
                    'success': False,
                    'message': f'API error: {response.status_code}',
                    'status': 'FAILED'
                }
        
        except Exception as e:
            return {
                'success': False,
                'message': f'Verification error: {str(e)}',
                'status': 'FAILED'
            }


class ManualPaymentGateway:
    """Manual payment gateway for bank transfers, cash payments, etc."""
    
    def __init__(self):
        pass
    
    def create_payment(self, amount, currency, description, customer_info):
        """Create a manual payment transaction"""
        try:
            import uuid
            transaction_id = f"MANUAL_{uuid.uuid4().hex[:12].upper()}"
            
            return {
                'success': True,
                'message': 'Manual payment created. Please complete payment and submit proof.',
                'transaction_id': transaction_id,
                'payment_url': None  # No payment URL for manual payments
            }
        
        except Exception as e:
            return {
                'success': False,
                'message': f'Manual payment creation error: {str(e)}',
                'transaction_id': None
            }
    
    def verify_payment(self, transaction_id):
        """Manual payments cannot be auto-verified - requires admin approval"""
        return {
            'success': False,
            'message': 'Manual payments require admin verification',
            'status': 'PENDING'
        }

# ------------------------------------------------------------------
# InstallmentGateway (mock implementation)
# ------------------------------------------------------------------
class InstallmentGateway:
    """Mock installment payment gateway.

    This placeholder provides the same interface as the other gateways
    (create_payment and verify_payment) so that the ``process_tournament_payment``
    function can instantiate it when the ``installment`` option is selected.
    It simply creates a mock transaction and returns a payment URL similar to
    the ``MockPaymentGateway``. In a real implementation this would integrate
    with an actual installment provider.
    """

    def __init__(self):
        self.base_url = "https://mock-installment.example.com"

    def create_payment(self, amount, currency, description, customer_info):
        """Create a mock installment payment transaction.

        Returns a successful response with a fake transaction ID and a URL
        where the user would normally complete the installment flow.
        """
        try:
            transaction_id = f"INSTALL_{uuid.uuid4().hex[:12].upper()}"
            return {
                'success': True,
                'message': 'Installment payment created successfully',
                'transaction_id': transaction_id,
                'payment_url': f"{self.base_url}/pay/{transaction_id}"
            }
        except Exception as e:
            return {
                'success': False,
                'message': f'Installment payment creation error: {str(e)}',
                'transaction_id': None
            }

    def verify_payment(self, transaction_id):
        """Mock verification – always returns pending as installment payments
        typically require manual confirmation.
        """
        return {
            'success': False,
            'message': 'Installment payments require manual verification',
            'status': 'PENDING'
        }


class SSLCommerzGateway:
    """SSLCommerz payment gateway integration"""
    
    def __init__(self):
        self.base_url = "https://sandbox.sslcommerz.com"
        self.api_key = settings.SSLCOMMERZ_API_KEY
        self.store_id = settings.SSLCOMMERZ_STORE_ID
    
    def create_payment(self, amount, currency, description, customer_info):
        """Create a payment transaction"""
        try:
            payload = {
                'store_id': self.store_id,
                'store_passwd': self.api_key,
                'total_amount': str(amount),
                'currency': currency,
                'tran_id': str(uuid.uuid4()),
                'success_url': f"{settings.FRONTEND_URL}/payment/success/",
                'fail_url': f"{settings.FRONTEND_URL}/payment/fail/",
                'cancel_url': f"{settings.FRONTEND_URL}/payment/cancel/",
                'product_name': description,
                'product_category': 'Gaming',
                'cus_name': customer_info.get('name', ''),
                'cus_email': customer_info.get('email', ''),
                'cus_add1': customer_info.get('address', ''),
                'cus_phone': customer_info.get('phone', ''),
                'shipping_method': 'NO',
                'multi_card_name': '',
                'value_a': 'Gaming Tournament',
                'value_b': 'Tournament Registration',
                'value_c': 'Registration',
                'value_d': 'HubZone'
            }
            
            headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
            
            response = requests.post(
                f"{self.base_url}/gwprocess/v4/api.php",
                json=payload,
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get('status') == 'SUCCESS':
                    return {
                        'success': True,
                        'message': 'Payment created successfully',
                        'transaction_id': result.get('tran_id'),
                        'payment_url': result.get('GatewayPageURL')
                    }
                else:
                    return {
                        'success': False,
                        'message': result.get('failedreason', 'Payment creation failed'),
                        'transaction_id': None
                    }
            else:
                return {
                    'success': False,
                    'message': f'API error: {response.status_code}',
                    'transaction_id': None
                }
        
        except Exception as e:
            return {
                'success': False,
                'message': f'Payment gateway error: {str(e)}',
                'transaction_id': None
            }
    
    def verify_payment(self, transaction_id):
        """Verify payment status"""
        try:
            payload = {
                'store_id': self.store_id,
                'store_passwd': self.api_key,
                'tran_id': transaction_id,
                'v': '1.0'
            }
            
            headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
            
            response = requests.post(
                f"{self.base_url}/validator/api/merchantTransValidationAPI.php",
                json=payload,
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get('status') == 'VALID':
                    return {
                        'success': True,
                        'message': 'Payment verified successfully',
                        'status': 'PAID',
                        'amount': Decimal(result.get('amount', '0')),
                        'currency': result.get('currency', 'BDT')
                    }
                else:
                    return {
                        'success': False,
                        'message': result.get('failedreason', 'Verification failed'),
                        'status': 'FAILED'
                    }
            else:
                return {
                    'success': False,
                    'message': f'API error: {response.status_code}',
                    'status': 'FAILED'
                }
        
        except Exception as e:
            return {
                'success': False,
                'message': f'Verification error: {str(e)}',
                'status': 'FAILED'
            }


def process_tournament_payment(participant_id, payment_gateway='mock'):
    """Process tournament payment"""
    try:
        participant = TournamentParticipant.objects.get(id=participant_id)
        tournament = participant.tournament
        
        # Get customer info
        customer_info = {
            'name': participant.gamer.username,
            'email': participant.gamer.email,
            'phone': '',  # Add phone field to user model if needed
            'address': ''
        }
        
        # Initialize appropriate payment gateway
        if payment_gateway == 'shurjopay':
            gateway = ShurjopayGateway()
        elif payment_gateway == 'sslcommerz':
            gateway = SSLCommerzGateway()
        elif payment_gateway == 'manual':
            gateway = ManualPaymentGateway()
        elif payment_gateway == 'installment':
            # New installment gateway (mock implementation)
            gateway = InstallmentGateway()
        else:
            gateway = MockPaymentGateway()
        
        # Create payment
        payment_result = gateway.create_payment(
            amount=tournament.entry_fee,
            currency='BDT',
            description=f"Tournament Registration - {tournament.title}",
            customer_info=customer_info
        )
        
        if payment_result['success']:
            # Update participant with transaction ID
            participant.payment_transaction_id = payment_result['transaction_id']
            participant.save()
            
            return {
                'success': True,
                'message': 'Payment initiated successfully',
                'transaction_id': payment_result['transaction_id'],
                'payment_url': payment_result.get('payment_url')
            }
        else:
            return {
                'success': False,
                'message': payment_result['message']
            }
    
    except TournamentParticipant.DoesNotExist:
        return {
            'success': False,
            'message': 'Participant not found'
        }
    except Exception as e:
        return {
            'success': False,
            'message': f'Payment processing error: {str(e)}'
        }


def verify_tournament_payment(participant_id, transaction_id):
    """Verify tournament payment"""
    try:
        participant = TournamentParticipant.objects.get(id=participant_id)
        
        # Check if it's a manual or installment payment
        if transaction_id.startswith('MANUAL_'):
            # Manual payments require admin approval
            return {
                'success': False,
                'message': 'Manual payments require admin verification',
                'payment_status': 'PENDING',
            }
        if transaction_id.startswith('INSTALLMENT_'):
            # Installment payments also require admin verification / schedule handling
            return {
                'success': False,
                'message': 'Installment payments require admin verification',
                'payment_status': 'PENDING_INSTALLMENT',
            }
        
        # Initialize appropriate payment gateway
        if participant.tournament.entry_fee > 1000:  # Use real gateway for larger amounts
            gateway = ShurjopayGateway()
        else:
            gateway = MockPaymentGateway()
        
        # Verify payment
        verification_result = gateway.verify_payment(transaction_id)
        
        if verification_result['success'] and verification_result['status'] == 'PAID':
            # Process successful payment
            participant.process_payment(
                transaction_id=transaction_id,
                amount=verification_result['amount']
            )
            
            return {
                'success': True,
                'message': 'Payment verified and processed successfully',
                'payment_status': 'PAID'
            }
        else:
            # Mark payment as failed
            participant.payment_status = 'FAILED'
            participant.save()
            
            return {
                'success': False,
                'message': verification_result['message'],
                'payment_status': 'FAILED'
            }
    
    except TournamentParticipant.DoesNotExist:
        return {
            'success': False,
            'message': 'Participant not found'
        }
    except Exception as e:
        return {
            'success': False,
            'message': f'Payment verification error: {str(e)}'
        }


def approve_manual_payment(participant_id, admin_user):
    """Approve a manual payment (admin only)"""
    try:
        participant = TournamentParticipant.objects.get(id=participant_id)
        
        # Verify it's a manual payment
        if not participant.payment_transaction_id or not participant.payment_transaction_id.startswith('MANUAL_'):
            return {
                'success': False,
                'message': 'This is not a manual payment'
            }
        
        # Check if payment is already processed
        if participant.payment_status == 'PAID':
            return {
                'success': False,
                'message': 'Payment already approved'
            }
        
        # Check if payment proof exists
        if not participant.payment_proof:
            return {
                'success': False,
                'message': 'Payment proof is required before approval'
            }
        
        # Process the payment
        participant.process_payment(
            transaction_id=participant.payment_transaction_id,
            amount=participant.tournament.entry_fee
        )
        
        # Set approval timestamp
        from django.utils import timezone
        participant.approved_at = timezone.now()
        participant.save()
        
        return {
            'success': True,
            'message': 'Manual payment approved successfully',
            'payment_status': 'PAID'
        }
    
    except TournamentParticipant.DoesNotExist:
        return {
            'success': False,
            'message': 'Participant not found'
        }
    except Exception as e:
        return {
            'success': False,
            'message': f'Payment approval error: {str(e)}'
        }


def reject_manual_payment(participant_id, admin_user, reason=''):
    """Reject a manual payment (admin only)"""
    try:
        participant = TournamentParticipant.objects.get(id=participant_id)
        
        # Verify it's a manual payment
        if not participant.payment_transaction_id or not participant.payment_transaction_id.startswith('MANUAL_'):
            return {
                'success': False,
                'message': 'This is not a manual payment'
            }
        
        # Check if payment is already processed
        if participant.payment_status == 'PAID':
            return {
                'success': False,
                'message': 'Payment already approved, cannot reject'
            }
        
        # Mark payment as failed
        participant.payment_status = 'FAILED'
        participant.rejection_reason = reason
        from django.utils import timezone
        participant.rejected_at = timezone.now()
        participant.save()
        
        # Revert tournament slots
        tournament = participant.tournament
        tournament.joined_slots -= 1
        tournament.update_status()
        tournament.save()
        
        # Delete participant
        participant.delete()
        
        return {
            'success': True,
            'message': 'Manual payment rejected and participant removed',
            'payment_status': 'FAILED'
        }
    
    except TournamentParticipant.DoesNotExist:
        return {
            'success': False,
            'message': 'Participant not found'
        }
    except Exception as e:
        return {
            'success': False,
            'message': f'Payment rejection error: {str(e)}'
        }


class InstallmentGateway:
    """Simple installment payment gateway (mock implementation)"""

    def __init__(self):
        # In a real system this would integrate with a payment provider that supports installments
        self.prefix = 'INSTALLMENT_'

    def create_payment(self, amount, currency, description, customer_info):
        """Create a mock installment payment transaction.
        Returns a transaction ID that indicates installment mode.
        """
        try:
            transaction_id = f"{self.prefix}{uuid.uuid4().hex[:12].upper()}"
            # For installments we assume the payment will be completed later, so no payment_url
            return {
                'success': True,
                'message': 'Installment payment created. Complete installments as per schedule.',
                'transaction_id': transaction_id,
                'payment_url': None,
            }
        except Exception as e:
            return {
                'success': False,
                'message': f'Installment payment creation error: {str(e)}',
                'transaction_id': None,
            }

    def verify_payment(self, transaction_id):
        """Mock verification – always pending until manually marked as PAID via admin. """
        # In a real implementation this would check the installment schedule/status.
        return {
            'success': False,
            'message': 'Installment payments require admin verification',
            'status': 'PENDING_INSTALLMENT',
        }