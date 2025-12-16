export type FilterStatus = "all" | "active" | "suspended";

export type ModalMode = "create" | "edit";

export type ClientPageParams = {
  filter?: FilterStatus;
  modal?: ModalMode;
  id?: string;
};

export type ModalState = {
  mode: ModalMode;
  clientId?: string;
} | null;
