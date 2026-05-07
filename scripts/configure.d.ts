export interface ConfigureOptions {
  root?: string;
  envFile?: string;
}

export function configureProject(options?: ConfigureOptions): Promise<void>;
