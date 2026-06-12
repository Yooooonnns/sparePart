export type RequestStatus = 'PENDING' | 'ISSUED' | 'CANCELLED';

export interface Project {
  id: string;
  name: string;
  lines?: Line[];
}

export interface Line {
  id: string;
  name: string;
  projectId: string;
  project: Project;
  posts?: Post[];
}

export interface Post {
  id: string;
  number: string;
  lineId: string;
  line: Line;
  postComponents?: PostComponent[];
}

export interface Component {
  id: string;
  reference: string;
  category: string;
}

export interface PostComponent {
  id: string;
  postId: string;
  componentId: string;
  qrCode: string;
  isActive: boolean;
  component: Component;
  post: Post;
}

export interface ComponentRequest {
  id: string;
  componentId: string;
  component: Component;
  postId: string;
  post: Post;
  notes: string | null;
  status: RequestStatus;
  requestedAt: string;
  issuedAt: string | null;
  issuedBy: string | null;
  cancelledAt: string | null;
}
