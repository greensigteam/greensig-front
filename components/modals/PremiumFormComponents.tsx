export type {
  PremiumInputProps,
  PremiumSelectProps,
  PremiumTextareaProps,
  PremiumButtonProps,
  PremiumSearchableSelectProps,
  PremiumMultiSelectProps,
} from './premium/types';

export { PremiumInput } from './premium/PremiumInput';
export { PremiumSelect } from './premium/PremiumSelect';
export { PremiumTextarea } from './premium/PremiumTextarea';
export { PremiumButton } from './premium/PremiumButton';
export { PremiumSearchableSelect } from './premium/PremiumSearchableSelect';
export { PremiumMultiSelect } from './premium/PremiumMultiSelect';

import { PremiumInput } from './premium/PremiumInput';
import { PremiumSelect } from './premium/PremiumSelect';
import { PremiumTextarea } from './premium/PremiumTextarea';
import { PremiumButton } from './premium/PremiumButton';
import { PremiumSearchableSelect } from './premium/PremiumSearchableSelect';
import { PremiumMultiSelect } from './premium/PremiumMultiSelect';

export default {
  Input: PremiumInput,
  Select: PremiumSelect,
  Textarea: PremiumTextarea,
  Button: PremiumButton,
  SearchableSelect: PremiumSearchableSelect,
  MultiSelect: PremiumMultiSelect,
};
