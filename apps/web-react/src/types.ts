// Buyer details collected at the partner's own checkout. Once the backend
// accept call is added, this type moves to the backend client (bff.ts).
export interface Purchaser {
  firstName: string;
  lastName: string;
  email: string;
}
