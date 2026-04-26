export interface FamilyMember {
  id: string;
  userId: string;
  name: string;
  fullName?: string;
  email?: string;
  role: 'owner' | 'user';
  pseudonym: string;
  relation?: string;
  status?: string;
}

export interface Family {
  id: string;
  adminId: string;
  name: string;
  memberIds: string[];
}

export interface Consent {
  id: string;
  share_brca2: boolean;
  share_lynch_syndrome: boolean;
  share_cardiomyopathy: boolean;
  share_to_all: boolean;
}
