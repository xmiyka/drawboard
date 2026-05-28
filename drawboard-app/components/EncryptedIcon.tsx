import { Tooltip } from "@drawboard/drawboard/components/Tooltip";
import { shield } from "@drawboard/drawboard/components/icons";
import { useI18n } from "@drawboard/drawboard/i18n";

export const EncryptedIcon = () => {
  const { t } = useI18n();

  return (
    <div className="encrypted-icon tooltip" aria-label={t("encrypted.link")}>
      <Tooltip label={t("encrypted.tooltip")} long={true}>
        {shield}
      </Tooltip>
    </div>
  );
};
