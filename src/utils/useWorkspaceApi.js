import { useState, useEffect } from 'react';
import * as Extensions from 'trimble-connect-project-workspace-api';
import { Logger } from './logger';

export const useWorkspaceApi = () => {
  // Checked synchronously so React never renders a standalone frame first.
  const [isEmbedded] = useState(window !== window.parent);

  const [workspaceApi, setWorkspaceApi] = useState(null);
  const [embeddedToken, setEmbeddedToken] = useState(null);
  const [embeddedProject, setEmbeddedProject] = useState(null);

  useEffect(() => {
    if (!isEmbedded) return;

    const initWorkspace = async () => {
      try {
        const api = await Extensions.connect(
          window.parent,
          (event, args) => {
            if (event === 'extension.command') {
              Logger.info(`Menu command: ${args.data}`);
            } else if (event === 'extension.accessToken') {
              setEmbeddedToken(args.data);
            }
          },
          30000,
        );

        setWorkspaceApi(api);

        await api.ui.setMenu({
          title: 'SitePass',
          icon: `${window.location.origin}/sitepass-logo.svg`,
          command: 'SITEPASS_MAIN_MENU',
        });

        const token = await api.extension.getPermission('accesstoken');
        if (token) setEmbeddedToken(token);

        const projectInfo = await api.project.getCurrentProject();
        Logger.info('Current project resolved via the Workspace API:', projectInfo);
        setEmbeddedProject(projectInfo);
      } catch (error) {
        Logger.error('Workspace API connection failed:', error.message);
      }
    };

    initWorkspace();
  }, [isEmbedded]);

  return { isEmbedded, workspaceApi, embeddedToken, embeddedProject };
};
