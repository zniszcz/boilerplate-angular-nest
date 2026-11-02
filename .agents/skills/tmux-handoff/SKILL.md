---
name: tmux-handoff
description: >
  Hands a step that needs a human (a password, a login, a confirmation, an
  interactive wizard) to the user through a ready tmux session they attach
  to. Use whenever you need the user to type a secret or answer an
  interactive program, instead of asking them to type commands.
metadata:
  kind: step
---

# Hand a step to the human in tmux

The human does not retype commands. You prepare a script, run it in a tmux
session, and the human only attaches, types the password or answers, and
detaches.

1. Write the script in your scratch folder, make it executable and check it
   with `bash -n`.
2. Start it with a clear header of what the human must do, for example
   `== Log in to the password manager. Type the password and press Enter. ==`.
3. A secret never appears on screen, in process arguments, in a log or on
   disk; it only goes through a pipe between commands.
4. Before an irreversible step, ask `[y/N]` and list what will change.
5. On success and on failure, print how to detach and keep the window open:

   ```bash
   echo "== Done. Detach: press Control + b, release, then press d. =="
   exec bash
   ```

6. Start: `tmux new-session -d -s <short-name> <script>`; check with
   `tmux capture-pane` that it waits for the human.
7. Tell the human, in this order: how to attach
   (`tmux attach -t <short-name>`, or over SSH
   `ssh -t <host> "tmux attach -t <short-name>"`), what to type, and how to
   detach (Control + b, release, then d).
8. Check the result yourself (a marker file, a state read), then
   `tmux kill-session -t <short-name>`.
