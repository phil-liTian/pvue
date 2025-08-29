import {
  Component,
  createApp,
  nodeOps,
  resolveComponent,
} from '@pvue/runtime-test'

/*
 * @Author: phil
 * @Date: 2025-08-29 15:30:18
 */
describe('resolveAssets', () => {
  test('should work', () => {
    const FooBar = () => null
    const BarBaz = { mounted: () => null }

    let component1: Component | string
    let component2: Component | string
    let component3: Component | string
    let component4: Component | string
    // let directive1: Directive
    // let directive2: Directive
    // let directive3: Directive
    // let directive4: Directive

    const Root = {
      name: 'Root',
      components: {
        FooBar: FooBar,
      },
      directives: {
        BarBaz: BarBaz,
      },
      setup() {
        return () => {
          component1 = resolveComponent('FooBar')!
          // directive1 = resolveDirective('BarBaz')!
          // camelize
          component2 = resolveComponent('Foo-bar')!
          // directive2 = resolveDirective('Bar-baz')!
          // capitalize
          component3 = resolveComponent('fooBar')!
          // directive3 = resolveDirective('barBaz')!
          // camelize and capitalize
          component4 = resolveComponent('foo-bar')!
          // directive4 = resolveDirective('bar-baz')!
        }
      },
    }

    const app = createApp(Root)
    const root = nodeOps.createElement('div')
    app.mount(root)
    expect(component1!).toBe(FooBar)
    expect(component2!).toBe(FooBar)
    expect(component3!).toBe(FooBar)
    expect(component4!).toBe(FooBar)

    // expect(directive1!).toBe(BarBaz)
    // expect(directive2!).toBe(BarBaz)
    // expect(directive3!).toBe(BarBaz)
    // expect(directive4!).toBe(BarBaz)
  })
})
