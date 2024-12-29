import { tags, text } from 'spellcaster/hyperscript.js'
import { reactiveElements } from '../common'
import { page } from '../signals'

/**
 *
 * @param page
 * @param setPage
 */
export function PageNav() {
  return tags.nav(
    {
      id: 'page-nav',
      className: 'justify-self-end mt-3 space-x-4',
    },
    reactiveElements(() => [
      NavItem('All_Videos', {
        href: '/',
        isActive: page() === 'all-videos',
      }),
      NavItem('My_Channel', {
        href: '/me/',
        isActive: page() === 'my-channel',
      }),
    ])
  )
}

/**
 *
 * @param t
 * @param root0
 * @param root0.href
 * @param root0.isActive
 */
function NavItem(
  t: string,
  { href, isActive }: { href: string; isActive: boolean }
) {
  const className = isActive
    ? 'text-flaming-june border-b-2 border-current'
    : 'cursor-pointer'

  const onclick = (event: Event) => {
    event.preventDefault()
    window.navigation.navigate(href)
  }

  return tags.a({ className, href, onclick }, text(t))
}
