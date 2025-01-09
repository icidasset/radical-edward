import { tags, text } from 'spellcaster/hyperscript.js'
import { reactiveElements } from '../common'
import { atProfile, page } from '../signals'

/**
 *
 */
export function PageNav() {
  return tags.nav(
    {
      id: 'page-nav',
      className: 'justify-self-end mt-3 space-x-4',
    },
    reactiveElements(() => {
      return [
        NavItem('All_Videos', {
          href: '/',
          isActive: page().id === 'all-videos',
        }),
        NavItem('My_Videos', {
          href: '/me/',
          isActive: page().id === 'my-videos',
        }),
        atProfile() === undefined
          ? tags.span({}, [])
          : NavItem('My_Channel', {
              href: `/channel/${atProfile()?.data?.did}`,
              isActive: page().id === 'channel',
            }),
      ]
    })
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
    ? 'text-fairy-tale border-b-2 border-current'
    : 'cursor-pointer'

  const onclick = (event: Event) => {
    event.preventDefault()
    window.navigation.navigate(href)
  }

  return tags.a({ className, href, onclick }, text(t))
}
