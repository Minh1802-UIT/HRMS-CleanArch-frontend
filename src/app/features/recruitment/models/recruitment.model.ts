export interface JobVacancy {
  id: string;
  title: string;
  description: string;
  vacancies: number;
  expiredDate: string;
  status: string;
  requirements: string[];
  createdAt: string;
  // UI helper fields
  totalCandidates?: number;
  department?: string;
  office?: string;
  employmentType?: string;
  selected?: boolean;
}

export interface Candidate {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  jobVacancyId: string;
  status: string;
  resumeUrl: string;
  appliedDate: string;
  // UI helper fields
  score?: number;
  avatar?: string;
  name?: string; // mapping for fullName
  jobTitle?: string;
  department?: string;
  employmentType?: string;
  selected?: boolean;
}

export interface RecruitmentStage {
  id: string;
  name: string;
  count: number;
  icon: string;
  color: string;
}
