import { LegalPage } from '../components/LegalPage';
import { LEGAL_BASIS, PRIVACY, SLOT_RULES, TERMS } from '../legal-content';

export function TermsScreen() {
  return <LegalPage doc={TERMS} />;
}

export function PrivacyScreen() {
  return <LegalPage doc={PRIVACY} />;
}

export function SlotRulesScreen() {
  return <LegalPage doc={SLOT_RULES} />;
}

export function LegalBasisScreen() {
  return <LegalPage doc={LEGAL_BASIS} />;
}
