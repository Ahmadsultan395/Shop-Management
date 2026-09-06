import { PageHeader } from "@/components/ui/PageHeader";
import { ShopInfoForm } from "./ShopInfoForm";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { getSettings } from "@/lib/db/settings";

export default function SettingsPage() {
  const settings = getSettings();
  return (
    <div>
      <PageHeader title="Settings" description="Shop information and account security." />
      <div className="space-y-6">
        <ShopInfoForm initial={settings} />
        <ChangePasswordForm />
      </div>
    </div>
  );
}
