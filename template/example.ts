import { EnumType } from "../types/enum";

function isCom(target) {
  return;
}
function comType(type) {
  return function (target) {
    target.comType = type;
  };
}

function compDataSource(source) {
  return function (target) {
    target.comDataSource = source;
  };
}

function comlayout(lay) {
  return function (target) {
    target.comlayout = lay;
  };
}

function comname(name) {
  return function (target) {
    target.comname = name;
  };
}

function happy(target, name, descriptor) {
  return;
}

function sad(target, name) {
  return;
}

@comType(EnumType.baseComp)
@compDataSource("web")
@comlayout("top")
@comname("zhangsan")
@isCom
class Test {
  @happy
  ds() {
    return "fdsg";
  }

  @sad member: string;

  @sdhjkgl
  private sh: dHD;
}

@comType(EnumType.extendComp)
@compDataSource("app")
@comlayout("bottom")
@comname("lisi231")
class Test2 {
  private ds() {
    return "fdsg";
  }
}
