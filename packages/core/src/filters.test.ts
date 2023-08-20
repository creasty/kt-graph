import { convertIdentPatternToRegexp, parseRegExp } from "./filters";

describe("convertIdentPatternToRegexp", () => {
  type Case = {
    pattern: string;
    good: string[];
    bad: string[];
  };
  const autoMakeCases = (title: string, cases: Case[]) => {
    describe(title, () => {
      it.each(cases.map((c) => [c.pattern, c]))("%s", (pattern, c: Case) => {
        const regexp = convertIdentPatternToRegexp(pattern);
        expect(regexp).toMatchSnapshot();
        expect(c.good.filter((value) => !regexp.test(value))).toHaveLength(0);
        expect(c.bad.filter((value) => regexp.test(value))).toHaveLength(0);
      });
    });
  };

  autoMakeCases("Plain", [
    {
      pattern: "alpha",
      good: ["alpha"],
      bad: ["1alpha", "alpha1", "x.alpha", "alpha.x"],
    },
    {
      pattern: "alpha.bravo",
      good: ["alpha.bravo"],
      bad: ["1alpha.bravo", "alpha.bravo1", "x.alpha.bravo", "alpha.bravo.x"],
    },
    {
      pattern: "alpha.bravo.charlie",
      good: ["alpha.bravo.charlie"],
      bad: ["1alpha.bravo.charlie", "alpha.bravo.charlie1", "x.alpha.bravo.charlie", "alpha.bravo.charlie.x"],
    },
  ]);
  autoMakeCases("? (not bounded) -- Any one alpha-num", [
    {
      pattern: "alpha?bravo",
      good: ["alphaxbravo"],
      bad: ["alphabravo", "alpha.bravo", "alphaxxxbravo"],
    },
  ]);
  autoMakeCases("? (half bounded) -- Any one alpha-num", [
    {
      pattern: "?bravo.charlie",
      good: ["xbravo.charlie"],
      bad: ["bravo.charlie", "xxxbravo.charlie", "alpha.bravo.charlie"],
    },
    {
      pattern: "alpha?.charlie",
      good: ["alphax.charlie"],
      bad: ["alpha.charlie", "alphaxxx.charlie", "alpha.bravo.charlie"],
    },
    {
      pattern: "alpha.?charlie",
      good: ["alpha.xcharlie"],
      bad: ["alpha.charlie", "alpha.xxxcharlie", "alpha.bravo.charlie"],
    },
    {
      pattern: "alpha.bravo?",
      good: ["alpha.bravox"],
      bad: ["alpha.bravo", "alpha.bravoxxx", "alpha.bravo.charlie"],
    },
  ]);
  autoMakeCases("? (bounded) -- Any one alpha-num", [
    {
      pattern: "?.bravo.charlie",
      good: ["x.bravo.charlie"],
      bad: ["bravo.charlie", "alpha.bravo.charlie"],
    },
    {
      pattern: "alpha.?.charlie",
      good: ["alpha.x.charlie"],
      bad: ["alpha.charlie", "alpha.bravo.charlie"],
    },
    {
      pattern: "alpha.bravo.?",
      good: ["alpha.bravo.x"],
      bad: ["alpha.bravo", "alpha.bravo.charlie"],
    },
  ]);
  autoMakeCases("* (not bounded) -- Zero or more alpha-num", [
    {
      pattern: "alpha*bravo",
      good: ["alphabravo", "alphaxbravo", "alphaxxxbravo"],
      bad: ["alpha.bravo"],
    },
  ]);
  autoMakeCases("* (half bounded) -- Zero or more alpha-num", [
    {
      pattern: "*bravo.charlie",
      good: ["bravo.charlie", "xxxbravo.charlie"],
      bad: ["alpha.bravo.charlie"],
    },
    {
      pattern: "alpha*.charlie",
      good: ["alpha.charlie", "alphaxxx.charlie"],
      bad: ["alpha.bravo.charlie"],
    },
    {
      pattern: "alpha.*charlie",
      good: ["alpha.charlie", "alpha.xxxcharlie"],
      bad: ["alpha.bravo.charlie"],
    },
    {
      pattern: "alpha.bravo*",
      good: ["alpha.bravo", "alpha.bravoxxx"],
      bad: ["alpha.bravo.charlie"],
    },
  ]);
  autoMakeCases("* (bounded) -- Zero or one component", [
    {
      pattern: "*.bravo.charlie",
      good: ["bravo.charlie", "alpha.bravo.charlie"],
      bad: ["xxx.yyy.bravo.charlie"],
    },
    {
      pattern: "alpha.*.charlie",
      good: ["alpha.charlie", "alpha.bravo.charlie"],
      bad: ["alpha.xxx.yyy.charlie"],
    },
    {
      pattern: "alpha.bravo.*",
      good: ["alpha.bravo", "alpha.bravo.charlie"],
      bad: ["alpha.bravo.xxx.yyy"],
    },
  ]);
  autoMakeCases("** (not bounded) -- Zero or more alpha-num", [
    {
      pattern: "alpha**bravo",
      good: ["alphabravo", "alphaxbravo", "alphaxxxbravo"],
      bad: ["alpha.bravo"],
    },
  ]);
  autoMakeCases("** (half bounded) -- Zero or more alpha-num", [
    {
      pattern: "**bravo.charlie",
      good: ["bravo.charlie", "xxxbravo.charlie"],
      bad: ["alpha.bravo.charlie"],
    },
    {
      pattern: "alpha**.charlie",
      good: ["alpha.charlie", "alphaxxx.charlie"],
      bad: ["alpha.bravo.charlie"],
    },
    {
      pattern: "alpha.**charlie",
      good: ["alpha.charlie", "alpha.xxxcharlie"],
      bad: ["alpha.bravo.charlie"],
    },
    {
      pattern: "alpha.bravo**",
      good: ["alpha.bravo", "alpha.bravoxxx"],
      bad: ["alpha.bravo.charlie"],
    },
  ]);
  autoMakeCases("** (bounded) -- Zero or more components", [
    {
      pattern: "**.bravo.charlie",
      good: ["bravo.charlie", "alpha.bravo.charlie", "xxx.yyy.bravo.charlie"],
      bad: [],
    },
    {
      pattern: "alpha.**.charlie",
      good: ["alpha.charlie", "alpha.bravo.charlie", "alpha.xxx.yyy.charlie"],
      bad: [],
    },
    {
      pattern: "alpha.bravo.**",
      good: ["alpha.bravo", "alpha.bravo.charlie", "alpha.bravo.xxx.yyy"],
      bad: [],
    },
  ]);
  autoMakeCases("{} (not bounded) -- Choices", [
    {
      pattern: "alpha{xxx,yyy}bravo",
      good: ["alphaxxxbravo", "alphayyybravo"],
      bad: ["alphabravo", "alpha.bravo", "alphazzzbravo"],
    },
  ]);
  autoMakeCases("{} (half bounded) -- Choices", [
    {
      pattern: "{alpha,xxx,yyy}bravo.charlie",
      good: ["alphabravo.charlie", "xxxbravo.charlie", "yyybravo.charlie"],
      bad: ["bravo.charlie", "xxx.bravo.charlie", "zzzbravo.charlie"],
    },
    {
      pattern: "alpha{bravo,xxx,yyy}.charlie",
      good: ["alphabravo.charlie", "alphaxxx.charlie", "alphayyy.charlie"],
      bad: ["alpha.charlie", "alpha.xxx.charlie", "alphazzz.charlie"],
    },
    {
      pattern: "alpha.{bravo,xxx,yyy}charlie",
      good: ["alpha.bravocharlie", "alpha.xxxcharlie", "alpha.yyycharlie"],
      bad: ["alpha.charlie", "alpha.xxx.charlie", "alpha.zzzcharlie"],
    },
    {
      pattern: "alpha.bravo{charlie,xxx,yyy}",
      good: ["alpha.bravocharlie", "alpha.bravoxxx", "alpha.bravoyyy"],
      bad: ["alpha.bravo", "alpha.bravo.xxx", "alpha.bravozzz"],
    },
  ]);
  autoMakeCases("{} (bounded) -- Choices", [
    {
      pattern: "{alpha,xxx,yyy}.bravo.charlie",
      good: ["alpha.bravo.charlie", "xxx.bravo.charlie", "yyy.bravo.charlie"],
      bad: ["bravo.charlie", "xxxbravo.charlie", "zzz.bravo.charlie"],
    },
    {
      pattern: "alpha.{bravo,xxx,yyy}.charlie",
      good: ["alpha.bravo.charlie", "alpha.xxx.charlie", "alpha.yyy.charlie"],
      bad: ["alpha.charlie", "alphaxxx.charlie", "alpha.zzz.charlie"],
    },
    {
      pattern: "alpha.bravo.{charlie,xxx,yyy}",
      good: ["alpha.bravo.charlie", "alpha.bravo.xxx", "alpha.bravo.yyy"],
      bad: ["alpha.bravo", "alpha.bravoxxx", "alpha.bravo.zzz"],
    },
  ]);
  autoMakeCases("[] (not bounded) -- Charset", [
    {
      pattern: "alpha[05]bravo",
      good: ["alpha0bravo", "alpha5bravo"],
      bad: ["alphabravo", "alpha9bravo", "alphaxbravo", "alpha.bravo"],
    },
    {
      pattern: "alpha[0-5]bravo",
      good: ["alpha0bravo", "alpha3bravo", "alpha5bravo"],
      bad: ["alphabravo", "alpha9bravo", "alphaxbravo", "alpha.bravo"],
    },
  ]);
  autoMakeCases("[] (half bounded) -- Charset", [
    {
      pattern: "[01]bravo.charlie",
      good: ["0bravo.charlie", "1bravo.charlie"],
      bad: ["bravo.charlie", "0.bravo.charlie", "9bravo.charlie"],
    },
    {
      pattern: "alpha[01].charlie",
      good: ["alpha0.charlie", "alpha1.charlie"],
      bad: ["alpha.charlie", "alpha.0.charlie", "alpha9.charlie"],
    },
    {
      pattern: "alpha.[01]charlie",
      good: ["alpha.0charlie", "alpha.1charlie"],
      bad: ["alpha.charlie", "alpha.0.charlie", "alpha.9charlie"],
    },
    {
      pattern: "alpha.bravo[01]",
      good: ["alpha.bravo0", "alpha.bravo1"],
      bad: ["alpha.bravo", "alpha.bravo.0", "alpha.bravo9"],
    },
  ]);
  autoMakeCases("[] (bounded) -- Charset", [
    {
      pattern: "[01].bravo.charlie",
      good: ["0.bravo.charlie", "1.bravo.charlie"],
      bad: ["bravo.charlie", "0bravo.charlie", "9.bravo.charlie"],
    },
    {
      pattern: "alpha.[01].charlie",
      good: ["alpha.0.charlie", "alpha.1.charlie"],
      bad: ["alpha.charlie", "alpha0.charlie", "alpha.9.charlie"],
    },
    {
      pattern: "alpha.bravo.[01]",
      good: ["alpha.bravo.0", "alpha.bravo.1"],
      bad: ["alpha.bravo", "alpha.bravo0", "alpha.bravo.9"],
    },
  ]);
  autoMakeCases("Complex examples", [
    {
      pattern: "alpha.bravo.*.delta.**",
      good: ["alpha.bravo.charlie.delta", "alpha.bravo.charlie.delta.echo", "alpha.bravo.charlie.delta.echo.foxtrot"],
      bad: ["alpha.bravo.charlie", "alpha.bravo.charlie.echo", "alpha.bravo.charlie.echo.foxtrot"],
    },
    {
      pattern: "**.echo.*Foo",
      good: ["echo.Foo", "echo.BooFoo", "alpha.echo.Foo", "alpha.bravo.echo.Foo", "alpha.bravo.echo.BooFoo"],
      bad: ["alpha.bravo.echo", "alpha.bravo.echo.FooXxx"],
    },
    {
      pattern: "**.echo.{foxtrot,golf}.**",
      good: ["echo.foxtrot", "alpha.bravo.echo.golf", "alpha.echo.golf.Foo", "alpha.echo.golf.Foo.Bar"],
      bad: ["alpha.bravo.echo", "alpha.bravo.echo.hotel"],
    },
    {
      pattern: "alpha.{bravo,*charlie}.delta",
      good: ["alpha.bravo.delta", "alpha.charlie.delta", "alpha.xxxcharlie.delta"],
      bad: ["alpha.delta", "alpha.bravo.charlie.delta"],
    },
    {
      pattern: "**.*Foo",
      good: ["alpha.Foo", "alpha.bravo.Foo", "alpha.bravo.BooFoo"],
      bad: ["Foo", "BooFoo", "alpha.bravo", "alpha.bravo.FooXxx"],
    },
    {
      pattern: "foo*.**",
      good: ["foo.alpha", "foo.alpha.bravo"],
      bad: ["foo", "xxxfoo", "fooxxx"],
    },
  ]);
});

describe("parseRegExp", () => {
  it.each(["alpha", "/alpha", "/alpha/", "/alpha/i", "/alpha/bravo/", "/alpha/bravo/i"])("%s", (pattern) => {
    const regexp = parseRegExp(pattern);
    expect(regexp).toMatchSnapshot();
  });
});
