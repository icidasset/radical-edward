import { type Signal, computed, effect } from 'spellcaster'
import { tags, text } from 'spellcaster/hyperscript.js'

/**
 *
 * @param page
 * @param setPage
 */
export function PageNav(page: Signal<string>, setPage: (page: string) => void) {
  return tags.nav(
    { id: 'page-nav', className: 'justify-self-end mt-3 space-x-4' },
    (element) => {
      const signal = computed(() => {
        return [
          NavItem('All_Videos', {
            isActive: page() === 'all-videos',
            onclick: () => { setPage('all-videos'); },
          }),
          NavItem('My_Channel', {
            isActive: page() === 'my-channel',
            onclick: () => { setPage('my-channel'); },
          }),
        ]
      })

      return effect(() => {
        element.replaceChildren(...signal())
      })
    }
  )
}

/**
 *
 * @param t
 * @param root0
 * @param root0.isActive
 * @param root0.onclick
 */
function NavItem(
  t: string,
  { isActive, onclick }: { isActive: boolean; onclick: () => void }
) {
  const className = isActive
    ? 'text-flaming-june border-b-2 border-current'
    : 'cursor-pointer'
  return tags.a({ className, onclick }, text(t))
}
