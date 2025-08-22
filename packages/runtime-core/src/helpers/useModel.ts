import { camelize, hyphenate } from '@pvue/shared'

export function getModelModifiers(
  props: Record<string, any>,
  modelName: string
) {

  return modelName === 'modelValue' || modelName === 'model-value'
    ? props.modelModifiers
    : props[`${modelName}Modifiers`] ||
        props[`${camelize(modelName)}Modifiers`] ||
        props[`${hyphenate(modelName)}Modifiers`]
}
