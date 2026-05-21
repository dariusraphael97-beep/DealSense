export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'failed';
export type ConversationStatus = 'active' | 'closed';
export type OfferStatus = 'pending' | 'accepted' | 'declined' | 'withdrawn';

export interface IdentityVerification {
  id: string;
  user_id: string;
  stripe_session_id: string | null;
  status: VerificationStatus;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  status: ConversationStatus;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export interface Offer {
  id: string;
  conversation_id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
  status: OfferStatus;
  message: string | null;
  created_at: string;
  updated_at: string;
}
