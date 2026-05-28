import {
  eyeIcon,
  GithubIcon,
  loginIcon,
  LogoutIcon,
  usersIcon,
} from "@drawboard/drawboard/components/icons";
import { MainMenu } from "@drawboard/drawboard/index";
import React from "react";

import { isDevEnv } from "@drawboard/common";

import { LanguageList } from "../app-language/LanguageList";

import { saveDebugState } from "./DebugCanvas";

import type { User } from "../data/CloudStorage";
import type { Theme } from "@drawboard/element/types";

export const AppMainMenu: React.FC<{
  onCollabDialogOpen: () => any;
  isCollaborating: boolean;
  isCollabEnabled: boolean;
  currentUser: User | null;
  onCloudBoardsOpen: () => void;
  onCloudSignIn: () => Promise<void>;
  onCloudSignOut: () => Promise<void>;
  theme: Theme | "system";
  setTheme: (theme: Theme | "system") => void;
  refresh: () => void;
}> = React.memo((props) => {
  return (
    <MainMenu>
      <MainMenu.DefaultItems.LoadScene />
      <MainMenu.DefaultItems.SaveToActiveFile />
      <MainMenu.DefaultItems.Export />
      <MainMenu.DefaultItems.SaveAsImage />
      {props.isCollabEnabled && (
        <MainMenu.DefaultItems.LiveCollaborationTrigger
          isCollaborating={props.isCollaborating}
          onSelect={() => props.onCollabDialogOpen()}
        />
      )}
      <MainMenu.Separator />
      {props.currentUser ? (
        <>
          <MainMenu.Item icon={usersIcon} onClick={props.onCloudBoardsOpen}>
            My Boards
          </MainMenu.Item>
          <MainMenu.Item
            onClick={() => void props.onCloudSignOut()}
            icon={LogoutIcon}
          >
            Sign out
          </MainMenu.Item>
        </>
      ) : (
        <MainMenu.Item
          icon={loginIcon}
          onClick={() => void props.onCloudSignIn()}
        >
          Login
        </MainMenu.Item>
      )}
      <MainMenu.Item
        icon={GithubIcon}
        onClick={() =>
          window.open(
            "https://github.com/excalidraw/excalidraw",
            "_blank",
            "noopener,noreferrer",
          )
        }
      >
        Based on Excalidraw
      </MainMenu.Item>
      <MainMenu.DefaultItems.CommandPalette className="highlighted" />
      <MainMenu.DefaultItems.SearchMenu />
      <MainMenu.DefaultItems.ClearCanvas />
      <MainMenu.Separator />
      {isDevEnv() && (
        <MainMenu.Item
          icon={eyeIcon}
          onClick={() => {
            if (window.visualDebug) {
              delete window.visualDebug;
              saveDebugState({ enabled: false });
            } else {
              window.visualDebug = { data: [] };
              saveDebugState({ enabled: true });
            }
            props?.refresh();
          }}
        >
          Visual Debug
        </MainMenu.Item>
      )}
      <MainMenu.Separator />
      <MainMenu.DefaultItems.ToggleTheme
        allowSystemTheme
        theme={props.theme}
        onSelect={props.setTheme}
      />
      <MainMenu.ItemCustom>
        <LanguageList style={{ width: "100%" }} />
      </MainMenu.ItemCustom>
      <MainMenu.DefaultItems.ChangeCanvasBackground />
    </MainMenu>
  );
});
