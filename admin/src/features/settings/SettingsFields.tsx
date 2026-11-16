import { useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff } from 'lucide-react';
import { useRef, useState, type RefObject } from 'react';
import { api } from '../../api/client';
import { useI18n } from '../../i18n';
import { toastError } from '../../i18n/toastMessages';
import { iconProps } from '../../ui/icons';
import { toast } from '../../ui/toast';
import { setBrand } from './brand';

export function SecretInput({
  id,
  value,
  onChange,
  placeholder,
  canReveal,
  onReveal,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  canReveal?: boolean;
  onReveal?: () => Promise<string>;
}) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const toggle = async () => {
    if (visible) return setVisible(false);
    if (!value.trim() && canReveal && onReveal) {
      setRevealing(true);
      try {
        const key = await onReveal();
        if (key) onChange(key);
      } catch {
        setRevealing(false);
        return;
      }
      setRevealing(false);
    }
    setVisible(true);
  };

  return (
    <div className="frkt-secret-input">
      <input id={id} type={visible ? 'text' : 'password'} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} autoComplete="off" spellCheck={false} autoCapitalize="off" autoCorrect="off" />
      <button
        type="button"
        className="frkt-secret-input__toggle"
        disabled={revealing}
        aria-label={visible ? t('hideApiKey') : t('showApiKey')}
        aria-pressed={visible}
        title={visible ? t('hideApiKey') : t('showApiKey')}
        onMouseDown={(event) => event.preventDefault()}
        onClick={(event) => { event.preventDefault(); event.stopPropagation(); void toggle(); }}
      >
        {revealing ? <span className="frkt-secret-input__spinner" aria-hidden="true" /> : visible ? <EyeOff {...iconProps} /> : <Eye {...iconProps} />}
      </button>
    </div>
  );
}

type SettingsCache = { whiteLabel?: { logoUrl: string; iconUrl: string } };

export function WhiteLabelFields({ logoUrl, iconUrl }: { logoUrl: string; iconUrl: string }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<'logo' | 'icon' | null>(null);
  const logoInput = useRef<HTMLInputElement>(null);
  const iconInput = useRef<HTMLInputElement>(null);
  const apply = (payload: { logoUrl: string; iconUrl: string }) => {
    setBrand(payload);
    queryClient.setQueryData(['settings'], (current: SettingsCache | undefined) => current ? { ...current, whiteLabel: payload } : current);
  };
  const upload = async (kind: 'logo' | 'icon', file?: File) => {
    if (!file) return;
    if (!/^image\/(png|jpeg|gif|webp)$/.test(file.type) && !/\.(png|jpe?g|gif|webp)$/i.test(file.name)) {
      toast.error(t('whiteLabelFileType')); return;
    }
    if (file.size > 2 * 1024 * 1024) { toast.error(t('whiteLabelTooLarge')); return; }
    setBusy(kind);
    try { apply(await api.uploadWhiteLabel(kind, file)); toast.success(t('whiteLabelSaved')); }
    catch (error) { toast.error(toastError('whiteLabelUploadFailed', error)); }
    finally { setBusy(null); }
  };
  const remove = async (kind: 'logo' | 'icon') => {
    setBusy(kind);
    try { apply(await api.removeWhiteLabel(kind)); toast.success(t('whiteLabelRemoved')); }
    catch (error) { toast.error(toastError('whiteLabelUploadFailed', error)); }
    finally { setBusy(null); }
  };
  const card = (kind: 'logo' | 'icon', url: string, input: RefObject<HTMLInputElement>) => (
    <article className="frkt-white-label__card">
      <div className={`frkt-white-label__preview${kind === 'icon' ? ' frkt-white-label__preview--icon' : ''}`}>{url ? <img src={url} alt="" /> : null}</div>
      <div className="frkt-white-label__copy"><h4>{t(kind === 'logo' ? 'whiteLabelLogo' : 'whiteLabelIcon')}</h4><p>{t(kind === 'logo' ? 'whiteLabelLogoHint' : 'whiteLabelIconHint')}</p></div>
      <div className="frkt-white-label__actions">
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; void upload(kind, file); }} />
        <button type="button" className="button" disabled={busy !== null} onClick={() => input.current?.click()}>{busy === kind ? t('saving') : url ? t('whiteLabelReplace') : t('whiteLabelUpload')}</button>
        {url ? <button type="button" className="button-link" disabled={busy !== null} onClick={() => void remove(kind)}>{t('whiteLabelRemove')}</button> : null}
      </div>
    </article>
  );
  return (
    <section className="frkt-settings-section" aria-labelledby="frkt-white-label-title">
      <header className="frkt-settings-section__head"><h3 id="frkt-white-label-title">{t('whiteLabelTitle')}</h3><p>{t('whiteLabelHint')}</p></header>
      <div className="frkt-white-label">{card('logo', logoUrl, logoInput)}{card('icon', iconUrl, iconInput)}</div>
    </section>
  );
}
