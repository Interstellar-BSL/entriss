export interface HostDirectoryEntry {
  id: string;
  name: string;
  email: string;
  role: {
    id: string;
    name: string;
    slug: string;
  };
  department: string;
}
