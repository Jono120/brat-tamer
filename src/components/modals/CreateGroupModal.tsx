/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useSocial } from "../../store/hooks";
import { useUiState } from "../../store/UiStateProvider";
import { Button, Input, Sheet } from "../ui";

export const CreateGroupModal = () => {
  const { createGroup } = useSocial();
  const { showCreateGroup, setShowCreateGroup } = useUiState();

  return (
    <Sheet
      open={showCreateGroup}
      onClose={() => setShowCreateGroup(false)}
      title="Create a Group"
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const ok = await createGroup(formData.get("name") as string);
          if (ok) setShowCreateGroup(false);
        }}
      >
        <div className="mb-8">
          <Input
            label="Group Name"
            name="name"
            required
            placeholder="e.g. The Sticker Squad"
          />
        </div>
        <Button type="submit" size="lg" fullWidth>
          Create Group
        </Button>
      </form>
    </Sheet>
  );
};
