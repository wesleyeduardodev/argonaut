export interface ArgoApplication {
  metadata: {
    name: string;
    namespace: string;
    uid: string;
    creationTimestamp: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
  };
  spec: {
    project: string;
    source?: {
      repoURL: string;
      path: string;
      targetRevision: string;
    };
    destination: {
      server: string;
      namespace: string;
    };
    syncPolicy?: {
      automated?: {
        prune: boolean;
        selfHeal: boolean;
      };
    };
  };
  status: {
    sync: {
      status: string;
      revision?: string;
    };
    health: {
      status: string;
      message?: string;
    };
    operationState?: {
      phase: string;
      message?: string;
      syncResult?: {
        revision: string;
      };
    };
    history?: Array<{
      id: number;
      revision: string;
      deployedAt: string;
      source?: {
        repoURL: string;
        path: string;
        targetRevision: string;
      };
    }>;
    resources?: ArgoResource[];
  };
}

export interface ArgoResource {
  group: string;
  version: string;
  kind: string;
  namespace: string;
  name: string;
  status: string;
  health?: {
    status: string;
    message?: string;
  };
}

export interface ArgoResourceTree {
  nodes: Array<{
    group: string;
    version: string;
    kind: string;
    namespace: string;
    name: string;
    uid: string;
    parentRefs?: Array<{
      group: string;
      kind: string;
      namespace: string;
      name: string;
      uid: string;
    }>;
    health?: {
      status: string;
      message?: string;
    };
    info?: Array<{
      name: string;
      value: string;
    }>;
  }>;
}

export interface ArgoProject {
  metadata: {
    name: string;
    namespace: string;
  };
  spec: {
    description?: string;
    sourceRepos: string[];
    destinations: Array<{
      server: string;
      namespace: string;
      name?: string;
    }>;
  };
}

export interface ArgoCluster {
  server: string;
  name: string;
  connectionState: {
    status: string;
    message?: string;
    attemptedAt?: string;
  };
  info?: {
    serverVersion?: string;
    applicationsCount?: number;
  };
}

export interface ArgoRepository {
  repo: string;
  type: string;
  connectionState: {
    status: string;
    message?: string;
  };
}

export interface ArgoEvent {
  type: string;
  reason: string;
  message: string;
  firstTimestamp: string;
  lastTimestamp: string;
  count: number;
  involvedObject: {
    kind: string;
    name: string;
    namespace: string;
  };
}

export interface ArgoServerConfig {
  url: string;
  authType: "token" | "userpass";
  token?: string;
  username?: string;
  password?: string;
  insecure: boolean;
}
