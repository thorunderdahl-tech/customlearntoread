// Popular US first names used to pre-render programmatic SEO landing pages
// (/personalized-book-for/[name]). The list seeds generateStaticParams and the
// sitemap; any other name still renders on demand (dynamicParams = true).
export const POPULAR_NAMES: string[] = [
  // Girls
  "Olivia", "Emma", "Charlotte", "Amelia", "Sophia", "Mia", "Isabella", "Ava",
  "Evelyn", "Luna", "Harper", "Sofia", "Camila", "Eleanor", "Elizabeth", "Violet",
  "Scarlett", "Emily", "Hazel", "Lily", "Gianna", "Aurora", "Penelope", "Aria",
  "Nora", "Chloe", "Ellie", "Mila", "Avery", "Layla", "Abigail", "Ella",
  "Isla", "Eliana", "Nova", "Madison", "Zoe", "Ivy", "Grace", "Hannah",
  "Stella", "Zoey", "Lucy", "Leah", "Riley", "Maya", "Naomi", "Addison",
  "Natalie", "Delilah", "Brooklyn", "Bella", "Aaliyah", "Sadie", "Quinn", "Josephine",
  "Ruby", "Claire", "Emery", "Savannah", "Kennedy", "Genesis", "Sarah", "Audrey",
  // Boys
  "Liam", "Noah", "Oliver", "James", "Elijah", "Mateo", "Theodore", "Henry",
  "Lucas", "William", "Benjamin", "Levi", "Sebastian", "Jack", "Ezra", "Michael",
  "Daniel", "Leo", "Owen", "Samuel", "Hudson", "Ethan", "Asher", "Luca",
  "Gabriel", "Carter", "Jayden", "Wyatt", "Julian", "Grayson", "Mason", "Logan",
  "Jackson", "David", "Aiden", "John", "Joseph", "Anthony", "Dylan", "Lincoln",
  "Adam", "Isaiah", "Charles", "Caleb", "Connor", "Cameron", "Eli", "Nathan",
  "Hunter", "Jonathan", "Christopher", "Thomas", "Theo", "Andrew", "Jordan", "Adrian",
  "Greyson", "Ryan", "Roman", "Nolan", "Easton", "Maverick", "Miles", "Weston",
  // Gender-neutral & popular variants
  "Charlie", "Finn", "Milo", "Ezekiel", "Arthur", "Beau", "Jasper", "Silas",
  "Felix", "Sawyer", "Rowan", "River", "Emerson", "Parker", "Reese", "Remi",
];

/** Slug used in the URL: lowercase, letters only. */
export const nameToSlug = (name: string): string =>
  name.toLowerCase().replace(/[^a-z]/g, "");

/** Render a stored/typed slug back to a display name (Title Case). */
export const slugToDisplayName = (slug: string): string => {
  const clean = slug.replace(/[^a-zA-Z]/g, "");
  if (!clean) return "";
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
};
