import { type Signal, computed, effect } from 'spellcaster'

export const reactiveElements =
  (signal: Signal<HTMLElement[]>) => (element: HTMLElement) => {
    const computedSignal = computed(signal)

    return effect(() => {
      element.replaceChildren(...computedSignal())
    })
  }

export const reactiveElement = (signal: Signal<HTMLElement>) => {
  return reactiveElements(() => {
    return [signal()]
  })
}
