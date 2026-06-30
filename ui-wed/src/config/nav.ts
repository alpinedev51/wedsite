export interface NavLink {
  label: string;
  to: string;
}

export const navLinks: NavLink[] = [
  { label: "Home", to: "/" },
  { label: "Our Story", to: "/our-story" },
  { label: "Wedding Party", to: "/wedding-party" },
  { label: "Things To Do", to: "/things-to-do" },
  { label: "Travel", to: "/travel" },
  { label: "Photos", to: "/photos" },
  { label: "Registry", to: "/registry" },
  { label: "RSVP", to: "/rsvp" },
];
