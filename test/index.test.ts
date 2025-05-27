import { describe, expect, it } from "vitest";
import { useMagicProps } from "../src";
import { mount } from "@vue/test-utils";
import { type ComponentPropsOptions, ref } from "vue";

describe("use-magic-props", () => {
  it("exists", () => {
    // Dumb test for a dumb package
    expect(useMagicProps).toBeTypeOf("function");
  });

  it("can add props at runtime", () => {
    const mockComponent = mount(
      {
        setup() {
          useMagicProps(["newProp"]);
        },
        template: "<div>{{ newProp }}</div>",
      },
      {
        props: {
          newProp: "value",
        },
      },
    );
    expect(mockComponent.html()).toContain("value");
  });

  it("can add props at runtime with simple type definition", () => {
    const mockComponent = mount(
      {
        setup() {
          useMagicProps({ newProp: String });
        },
        template: "<div>{{ newProp }}</div>",
      },
      {
        props: {
          newProp: "value",
        },
      },
    );
    expect(mockComponent.html()).toContain("value");
  });

  it("can add props at runtime with complex type definition", () => {
    const mockComponent = mount(
      {
        setup() {
          useMagicProps({ newProp: { type: String, required: true } });
        },
        template: "<div>{{ newProp }}</div>",
      },
      {
        props: {
          newProp: "value",
        },
      },
    );
    expect(mockComponent.html()).toContain("value");
  });
  it("can add props at runtime with a ref as the definition", () => {
    const mockComponent = mount(
      {
        setup() {
          const propsDef = ref(["newProp"]);
          useMagicProps(propsDef);
        },
        template: "<div>{{ newProp }}</div>",
      },
      {
        props: {
          newProp: "value",
        },
      },
    );
    expect(mockComponent.html()).toContain("value");
  });
  it("can add props at runtime with a ref as the definition", () => {
    const mockComponent = mount(
      {
        setup() {
          const propsDef = ref<string[]>([]);
          useMagicProps(propsDef);
          propsDef.value.push("newProp");
        },
        template: "<div>{{ newProp }}</div>",
      },
      {
        props: {
          newProp: "value",
        },
      },
    );
    expect(mockComponent.html()).toContain("value");
  });
  it("can add props at runtime with complex type definition", () => {
    const mockComponent = mount(
      {
        template: "<div>{{ newProp }}</div>",
        setup() {
          const propsDef = ref<ComponentPropsOptions<Record<string, unknown>>>(
            {},
          );
          useMagicProps(propsDef);
          // @ts-expect-error We'll need to figure out how to dynamically add a type here?
          propsDef.value.newProp = {
            type: String,
          };
        },
      },
      {
        props: {
          newProp: "value",
        },
      },
    );
    expect(mockComponent.html()).toContain("value");
  });
});
