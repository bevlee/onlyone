export interface Player {
  id: string;   // Global user ID (persistent for registered users, temporary for guests)
  name: string; // Globally unique display name
}