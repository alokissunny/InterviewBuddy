export interface Experience {
  company: string;
  role: string;
  duration: string;
  highlights: string[];
}

export interface Education {
  institution: string;
  degree: string;
  year: string;
}

export interface Project {
  name: string;
  description: string;
  technologies: string[];
}

export interface CandidateProfile {
  name: string;
  title: string;
  email?: string;
  phone?: string;
  summary: string;
  photoUrl?: string;
  profileUrl?: string;
  skills: string[];
  experience: Experience[];
  education: Education[];
  projects: Project[];
  achievements: string[];
}

export interface TranscriptEntry {
  id: string;
  text: string;
  timestamp: Date;
  isInterim: boolean;
  speaker?: 'interviewer' | 'interviewee';
}

export type AppPage = 'setup' | 'interview';
