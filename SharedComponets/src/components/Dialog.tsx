import * as Dialog from "@radix-ui/react-dialog";
import React from "react";

export default function SharedDialog({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button>{title}</button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content>
          <Dialog.Title>{title}</Dialog.Title>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
