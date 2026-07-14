import { getFlowerTranslation } from '../../../flower-translations';
import { FLOWER_GROUPS } from '../../../utils/bouquetData';

export const getTranslatedFlowerData = (locale: string, group: typeof FLOWER_GROUPS[0], colorId?: string) => {
  const targetId = colorId || group.colors[0].id;
  const translation = getFlowerTranslation(locale, targetId);

  if (colorId) {
    // For specific color variant
    const color = group.colors.find(c => c.id === colorId);
    return {
      name: translation?.name || color?.name || group.name,
      meaning: translation?.meaning || color?.meaning || group.meaning,
      purpose: translation?.purpose || color?.purpose || group.purpose,
      bestFor: translation?.bestFor || color?.bestFor || group.bestFor,
    };
  }

  // For main group
  return {
    name: translation?.name || group.name,
    meaning: translation?.meaning || group.meaning,
    purpose: translation?.purpose || group.purpose,
    bestFor: translation?.bestFor || group.bestFor,
  };
};
