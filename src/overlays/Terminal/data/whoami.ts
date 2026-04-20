export interface WhoamiData {
  name: string;
  alias: string;
  based: string;
  study: string;
  status: string;
  served: string;
  major: string;
  bio: string;
  interests: string[];
  contact: ContactData;
}

export interface ContactData {
  email: string;
  github: string;
  linkedin: string;
  phone: string;
  location: string;
  status: string;
}

export const WHOAMI: WhoamiData = {
  name: "Seungwan",
  alias: "duru",
  based: "Hong Kong / Seoul",
  study: "BSc CS + Extended Major AI @ HKUST",
  status: "CS Student @ HKUST",
  served: "ROK Military (completed)",
  major: "Computer Science + AI",
  bio:
    "Year 2 CS student at HKUST. Passionate in Artificial Intelligence and Full-stack development. " +
    "Likes to build, do hackathons, tackle real problems. Currently collaborating with HKUST CLE to " +
    "assist instructors and students with AI.",
  interests: [
    "AI · Creative Coding · Hackathons",
    "Music Production · Generative Art",
    "Equity Markets (US + KR)",
  ],
  contact: {
    email: "skangal@connect.ust.hk",
    github: "github.com/baduru11",
    linkedin: "www.linkedin.com/in/seungwan-kang-6548ab33b",
    phone: "+852 4717 8551",
    location: "HKG",
    status: "open to collab, hire, say hi",
  },
};
