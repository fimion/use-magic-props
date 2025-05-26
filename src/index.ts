import { unref, watch, getCurrentInstance, camelize } from "vue";
import type { MaybeRef, ComponentInternalInstance } from "vue";

/* eslint-disable @typescript-eslint/no-explicit-any */

// If the type T accepts type "any", output type Y, otherwise output type N.
// https://stackoverflow.com/questions/49927523/disallow-call-with-any/49928360#49928360
export type IfAny<T, Y, N> = 0 extends 1 & T ? Y : N;

type Data = Record<string, unknown>;

type ComponentMagicInternalInstance = {
  propsOptions: NormalizedPropsOptions;
  propsDefaults: Data;
  ctx: Data;
} & ComponentInternalInstance;

type ComponentPropsOptions<P = Data> =
  | ComponentObjectPropsOptions<P>
  | string[];

type ComponentObjectPropsOptions<P = Data> = {
  [K in keyof P]: Prop<P[K]> | null;
};

type Prop<T, D = T> = PropOptions<T, D> | PropType<T>;

type DefaultFactory<T> = (props: Data) => T | null | undefined;

export interface PropOptions<T = any, D = T> {
  type?: PropType<T> | true | null;
  required?: boolean;
  default?: D | DefaultFactory<D> | null | undefined | object;

  validator?(value: unknown, props: Data): boolean;

  /**
   * @internal
   */
  skipCheck?: boolean;
  /**
   * @internal
   */
  skipFactory?: boolean;
}

export type PropType<T> = PropConstructor<T> | (PropConstructor<T> | null)[];

type PropConstructor<T = any> =
  | { new (...args: any[]): T & {} }
  | { (): T }
  | PropMethod<T>;

type PropMethod<T, TConstructor = any> = [T] extends [
  ((...args: any) => any) | undefined,
] // if is function with args, allowing non-required functions
  ? { new (): TConstructor; (): T; readonly prototype: TConstructor } // Create Function like constructor
  : never;

type RequiredKeys<T> = {
  [K in keyof T]: T[K] extends
    | { required: true }
    | { default: any }
    // don't mark Boolean props as undefined
    | BooleanConstructor
    | { type: BooleanConstructor }
    ? T[K] extends { default: undefined | (() => undefined) }
      ? never
      : K
    : never;
}[keyof T];

type OptionalKeys<T> = Exclude<keyof T, RequiredKeys<T>>;

type DefaultKeys<T> = {
  [K in keyof T]: T[K] extends
    | { default: any }
    // Boolean implicitly defaults to false
    | BooleanConstructor
    | { type: BooleanConstructor }
    ? T[K] extends { type: BooleanConstructor; required: true } // not default if Boolean is marked as required
      ? never
      : K
    : never;
}[keyof T];

type InferPropType<T, NullAsAny = true> = [T] extends [null]
  ? NullAsAny extends true
    ? any
    : null
  : [T] extends [{ type: null | true }]
    ? any // As TS issue https://github.com/Microsoft/TypeScript/issues/14829 // somehow `ObjectConstructor` when inferred from { (): T } becomes `any` // `BooleanConstructor` when inferred from PropConstructor(with PropMethod) becomes `Boolean`
    : [T] extends [ObjectConstructor | { type: ObjectConstructor }]
      ? Record<string, any>
      : [T] extends [BooleanConstructor | { type: BooleanConstructor }]
        ? boolean
        : [T] extends [DateConstructor | { type: DateConstructor }]
          ? Date
          : [T] extends [(infer U)[] | { type: (infer U)[] }]
            ? U extends DateConstructor
              ? Date | InferPropType<U, false>
              : InferPropType<U, false>
            : [T] extends [Prop<infer V, infer D>]
              ? unknown extends V
                ? keyof V extends never
                  ? IfAny<V, V, D>
                  : V
                : V
              : T;

/**
 * Extract prop types from a runtime props options object.
 * The extracted types are **internal** - i.e. the resolved props received by
 * the component.
 * - Boolean props are always present
 * - Props with default values are always present
 *
 * To extract accepted props from the parent, use {@link ExtractPublicPropTypes}.
 */
export type ExtractPropTypes<O> = {
  // use `keyof Pick<O, RequiredKeys<O>>` instead of `RequiredKeys<O>` to
  // support IDE features
  [K in keyof Pick<O, RequiredKeys<O>>]: InferPropType<O[K]>;
} & {
  // use `keyof Pick<O, OptionalKeys<O>>` instead of `OptionalKeys<O>` to
  // support IDE features
  [K in keyof Pick<O, OptionalKeys<O>>]?: InferPropType<O[K]>;
};

type PublicRequiredKeys<T> = {
  [K in keyof T]: T[K] extends { required: true } ? K : never;
}[keyof T];

type PublicOptionalKeys<T> = Exclude<keyof T, PublicRequiredKeys<T>>;

/**
 * Extract prop types from a runtime props options object.
 * The extracted types are **public** - i.e. the expected props that can be
 * passed to component.
 */
export type ExtractPublicPropTypes<O> = {
  [K in keyof Pick<O, PublicRequiredKeys<O>>]: InferPropType<O[K]>;
} & {
  [K in keyof Pick<O, PublicOptionalKeys<O>>]?: InferPropType<O[K]>;
};

enum BooleanFlags {
  shouldCast,
  shouldCastTrue,
}

// extract props which defined with default from prop options
export type ExtractDefaultPropTypes<O> = O extends object
  ? // use `keyof Pick<O, DefaultKeys<O>>` instead of `DefaultKeys<O>` to support IDE features
    { [K in keyof Pick<O, DefaultKeys<O>>]: InferPropType<O[K]> }
  : Record<never, never>;

type NormalizedProp = PropOptions & {
  [BooleanFlags.shouldCast]?: boolean;
  [BooleanFlags.shouldCastTrue]?: boolean;
};

// normalized value is a tuple of the actual normalized options
// and an array of prop keys that need value casting (booleans and defaults)
export type NormalizedProps = Record<string, NormalizedProp>;
export type NormalizedPropsOptions = [NormalizedProps, string[]] | [];

function getPropKeys(propsDef: string[] | Record<string, unknown>) {
  if (!propsDef) return [];
  if (Array.isArray(propsDef)) return propsDef.map(camelize);
  return Object.keys(propsDef).map(camelize);
}

/**
 *
 * @param propsDef
 * @returns {Data}
 */
export function useMagicProps(propsDef: MaybeRef<ComponentPropsOptions>) {
  const instance = getCurrentInstance() as ComponentMagicInternalInstance;

  watch(
    () =>
      Array.isArray(unref(propsDef))
        ? [...(unref(propsDef) as string[])]
        : { ...unref(propsDef) },
    (_def) => {
      if (instance.propsOptions.length === 0) {
        const newOptions: NormalizedPropsOptions = [{}, []];
        (instance.ctx._ as Data).propsOptions = newOptions;
        instance.propsOptions = newOptions;
      }
      const { propsDefaults, propsOptions, props, attrs } = instance;
      const { props: originalPropsDef } = instance.type;

      const [options, needCastKeys] = propsOptions;

      const normalizedPropDef: NormalizedProps = {};

      if (Array.isArray(_def)) {
        _def.forEach((key) => {
          normalizedPropDef[camelize(key)] = {};
        });
      } else {
        for (const key in _def) {
          normalizedPropDef[camelize(key)] = _def[key] as NormalizedProp;
        }
      }

      const allPropNames = new Set([
        ...getPropKeys(_def),
        ...getPropKeys(originalPropsDef),
      ]);

      for (const key in props) {
        if (!allPropNames.has(key)) {
          attrs[key] = props[key];
          delete props[key];
          delete options[key];
          if (needCastKeys.includes(key)) {
            needCastKeys.splice(needCastKeys.indexOf(key), 1);
          }
        }
      }

      for (const key in attrs) {
        if (allPropNames.has(camelize(key))) {
          props[camelize(key)] = attrs[key];
          delete attrs[key];
        }
      }
      for (const key in normalizedPropDef) {
        if (getPropKeys(originalPropsDef).includes(key)) continue;
        if (!(key in options)) {
          options[key] = {
            0: false,
            1: true,
          };
          if (normalizedPropDef[key]) {
            const propDef = normalizedPropDef[key];
            if (typeof propDef === "function") {
              options[key].type = propDef as PropType<any>;
            } else {
              options[key] = {
                ...propDef,
                ...options[key],
              };

              if (propDef?.default && typeof props[key] === "undefined") {
                if (!needCastKeys.includes(key)) {
                  needCastKeys.push(key);
                }
                if (typeof propDef.default === "function") {
                  propsDefaults[key] = propDef.default();
                } else {
                  propsDefaults[key] = propDef.default;
                }
                props[key] = propsDefaults[key];
              }
            }
          }
        }
      }
    },
    { immediate: true },
  );

  return instance.props;
}
