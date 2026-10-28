import React from "react";
import { useRouter } from "expo-router";
import { KaiKnowledgeModal } from "../components/kai-knowledge-modal";

export function KaiKnowledgeScreen() {
  const router = useRouter();

  return (
    <KaiKnowledgeModal
      onClose={() => router.back()}
      visible={true}
    />
  );
}
