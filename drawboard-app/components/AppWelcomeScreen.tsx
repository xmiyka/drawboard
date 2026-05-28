import { WelcomeScreen } from "@drawboard/drawboard/index";
import { usersIcon } from "@drawboard/drawboard/components/icons";
import React from "react";

import { useAtomValue, currentUserAtom, userBoardsAtom } from "../app-jotai";

export const AppWelcomeScreen: React.FC<{
  onCollabDialogOpen: () => any;
  isCollabEnabled: boolean;
  onOpenBoards: () => void;
}> = React.memo((props) => {
  const currentUser = useAtomValue(currentUserAtom);
  const boards = useAtomValue(userBoardsAtom);

  const greeting = currentUser
    ? `Welcome back, ${currentUser.name.split(" ")[0]}!`
    : "Your personal whiteboard";

  return (
    <WelcomeScreen>
      <WelcomeScreen.Hints.MenuHint />
      <WelcomeScreen.Hints.ToolbarHint />
      <WelcomeScreen.Hints.HelpHint />
      <WelcomeScreen.Center>
        <WelcomeScreen.Center.Logo />
        <WelcomeScreen.Center.Heading>{greeting}</WelcomeScreen.Center.Heading>
        <WelcomeScreen.Center.Menu>
          <WelcomeScreen.Center.MenuItemLoadScene />
          {currentUser && (
            <WelcomeScreen.Center.MenuItem
              onSelect={props.onOpenBoards}
              icon={usersIcon}
              shortcut={null}
            >
              My Boards
              {boards.length > 0 && (
                <span
                  style={{
                    opacity: 0.55,
                    fontSize: "0.8em",
                    marginLeft: "0.4em",
                  }}
                >
                  ({boards.length})
                </span>
              )}
            </WelcomeScreen.Center.MenuItem>
          )}
          <WelcomeScreen.Center.MenuItemHelp />
          {props.isCollabEnabled && (
            <WelcomeScreen.Center.MenuItemLiveCollaborationTrigger
              onSelect={() => props.onCollabDialogOpen()}
            />
          )}
        </WelcomeScreen.Center.Menu>
      </WelcomeScreen.Center>
    </WelcomeScreen>
  );
});
