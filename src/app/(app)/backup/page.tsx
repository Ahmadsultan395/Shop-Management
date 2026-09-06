import { PageHeader } from "@/components/ui/PageHeader";
import { BackupRestore } from "./BackupRestore";

export default function BackupPage() {
  return (
    <div>
      <PageHeader title="Backup" description="Protect your offline data." />
      <BackupRestore />
    </div>
  );
}
