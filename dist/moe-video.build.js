(function () {
function resolve() {
document.body.removeAttribute('unresolved');
}
if (window.WebComponents) {
addEventListener('WebComponentsReady', resolve);
} else {
if (document.readyState === 'interactive' || document.readyState === 'complete') {
resolve();
} else {
addEventListener('DOMContentLoaded', resolve);
}
}
}());
window.Polymer = {
Settings: function () {
var settings = window.Polymer || {};
var parts = location.search.slice(1).split('&');
for (var i = 0, o; i < parts.length && (o = parts[i]); i++) {
o = o.split('=');
o[0] && (settings[o[0]] = o[1] || true);
}
settings.wantShadow = settings.dom === 'shadow';
settings.hasShadow = Boolean(Element.prototype.createShadowRoot);
settings.nativeShadow = settings.hasShadow && !window.ShadowDOMPolyfill;
settings.useShadow = settings.wantShadow && settings.hasShadow;
settings.hasNativeImports = Boolean('import' in document.createElement('link'));
settings.useNativeImports = settings.hasNativeImports;
settings.useNativeCustomElements = !window.CustomElements || window.CustomElements.useNative;
settings.useNativeShadow = settings.useShadow && settings.nativeShadow;
settings.usePolyfillProto = !settings.useNativeCustomElements && !Object.__proto__;
return settings;
}()
};
(function () {
var userPolymer = window.Polymer;
window.Polymer = function (prototype) {
if (typeof prototype === 'function') {
prototype = prototype.prototype;
}
if (!prototype) {
prototype = {};
}
var factory = desugar(prototype);
prototype = factory.prototype;
var options = { prototype: prototype };
if (prototype.extends) {
options.extends = prototype.extends;
}
Polymer.telemetry._registrate(prototype);
document.registerElement(prototype.is, options);
return factory;
};
var desugar = function (prototype) {
var base = Polymer.Base;
if (prototype.extends) {
base = Polymer.Base._getExtendedPrototype(prototype.extends);
}
prototype = Polymer.Base.chainObject(prototype, base);
prototype.registerCallback();
return prototype.constructor;
};
if (userPolymer) {
for (var i in userPolymer) {
Polymer[i] = userPolymer[i];
}
}
Polymer.Class = desugar;
}());
Polymer.telemetry = {
registrations: [],
_regLog: function (prototype) {
console.log('[' + prototype.is + ']: registered');
},
_registrate: function (prototype) {
this.registrations.push(prototype);
Polymer.log && this._regLog(prototype);
},
dumpRegistrations: function () {
this.registrations.forEach(this._regLog);
}
};
Object.defineProperty(window, 'currentImport', {
enumerable: true,
configurable: true,
get: function () {
return (document._currentScript || document.currentScript).ownerDocument;
}
});
Polymer.RenderStatus = {
_ready: false,
_callbacks: [],
whenReady: function (cb) {
if (this._ready) {
cb();
} else {
this._callbacks.push(cb);
}
},
_makeReady: function () {
this._ready = true;
for (var i = 0; i < this._callbacks.length; i++) {
this._callbacks[i]();
}
this._callbacks = [];
},
_catchFirstRender: function () {
requestAnimationFrame(function () {
Polymer.RenderStatus._makeReady();
});
},
_afterNextRenderQueue: [],
_waitingNextRender: false,
afterNextRender: function (element, fn, args) {
this._watchNextRender();
this._afterNextRenderQueue.push([
element,
fn,
args
]);
},
_watchNextRender: function () {
if (!this._waitingNextRender) {
this._waitingNextRender = true;
var fn = function () {
Polymer.RenderStatus._flushNextRender();
};
if (!this._ready) {
this.whenReady(fn);
} else {
requestAnimationFrame(fn);
}
}
},
_flushNextRender: function () {
var self = this;
setTimeout(function () {
self._flushRenderCallbacks(self._afterNextRenderQueue);
self._afterNextRenderQueue = [];
self._waitingNextRender = false;
});
},
_flushRenderCallbacks: function (callbacks) {
for (var i = 0, h; i < callbacks.length; i++) {
h = callbacks[i];
h[1].apply(h[0], h[2] || Polymer.nar);
}
}
};
if (window.HTMLImports) {
HTMLImports.whenReady(function () {
Polymer.RenderStatus._catchFirstRender();
});
} else {
Polymer.RenderStatus._catchFirstRender();
}
Polymer.ImportStatus = Polymer.RenderStatus;
Polymer.ImportStatus.whenLoaded = Polymer.ImportStatus.whenReady;
(function () {
'use strict';
var settings = Polymer.Settings;
Polymer.Base = {
__isPolymerInstance__: true,
_addFeature: function (feature) {
this.extend(this, feature);
},
registerCallback: function () {
this._desugarBehaviors();
this._doBehavior('beforeRegister');
this._registerFeatures();
if (!settings.lazyRegister) {
this.ensureRegisterFinished();
}
},
createdCallback: function () {
if (!this.__hasRegisterFinished) {
this._ensureRegisterFinished(this.__proto__);
}
Polymer.telemetry.instanceCount++;
this.root = this;
this._doBehavior('created');
this._initFeatures();
},
ensureRegisterFinished: function () {
this._ensureRegisterFinished(this);
},
_ensureRegisterFinished: function (proto) {
if (proto.__hasRegisterFinished !== proto.is) {
proto.__hasRegisterFinished = proto.is;
if (proto._finishRegisterFeatures) {
proto._finishRegisterFeatures();
}
proto._doBehavior('registered');
}
},
attachedCallback: function () {
var self = this;
Polymer.RenderStatus.whenReady(function () {
self.isAttached = true;
self._doBehavior('attached');
});
},
detachedCallback: function () {
this.isAttached = false;
this._doBehavior('detached');
},
attributeChangedCallback: function (name, oldValue, newValue) {
this._attributeChangedImpl(name);
this._doBehavior('attributeChanged', [
name,
oldValue,
newValue
]);
},
_attributeChangedImpl: function (name) {
this._setAttributeToProperty(this, name);
},
extend: function (prototype, api) {
if (prototype && api) {
var n$ = Object.getOwnPropertyNames(api);
for (var i = 0, n; i < n$.length && (n = n$[i]); i++) {
this.copyOwnProperty(n, api, prototype);
}
}
return prototype || api;
},
mixin: function (target, source) {
for (var i in source) {
target[i] = source[i];
}
return target;
},
copyOwnProperty: function (name, source, target) {
var pd = Object.getOwnPropertyDescriptor(source, name);
if (pd) {
Object.defineProperty(target, name, pd);
}
},
_log: console.log.apply.bind(console.log, console),
_warn: console.warn.apply.bind(console.warn, console),
_error: console.error.apply.bind(console.error, console),
_logf: function () {
return this._logPrefix.concat([this.is]).concat(Array.prototype.slice.call(arguments, 0));
}
};
Polymer.Base._logPrefix = function () {
var color = window.chrome || /firefox/i.test(navigator.userAgent);
return color ? [
'%c[%s::%s]:',
'font-weight: bold; background-color:#EEEE00;'
] : ['[%s::%s]:'];
}();
Polymer.Base.chainObject = function (object, inherited) {
if (object && inherited && object !== inherited) {
if (!Object.__proto__) {
object = Polymer.Base.extend(Object.create(inherited), object);
}
object.__proto__ = inherited;
}
return object;
};
Polymer.Base = Polymer.Base.chainObject(Polymer.Base, HTMLElement.prototype);
if (window.CustomElements) {
Polymer.instanceof = CustomElements.instanceof;
} else {
Polymer.instanceof = function (obj, ctor) {
return obj instanceof ctor;
};
}
Polymer.isInstance = function (obj) {
return Boolean(obj && obj.__isPolymerInstance__);
};
Polymer.telemetry.instanceCount = 0;
}());
(function () {
var modules = {};
var lcModules = {};
var findModule = function (id) {
return modules[id] || lcModules[id.toLowerCase()];
};
var DomModule = function () {
return document.createElement('dom-module');
};
DomModule.prototype = Object.create(HTMLElement.prototype);
Polymer.Base.extend(DomModule.prototype, {
constructor: DomModule,
createdCallback: function () {
this.register();
},
register: function (id) {
id = id || this.id || this.getAttribute('name') || this.getAttribute('is');
if (id) {
this.id = id;
modules[id] = this;
lcModules[id.toLowerCase()] = this;
}
},
import: function (id, selector) {
if (id) {
var m = findModule(id);
if (!m) {
forceDomModulesUpgrade();
m = findModule(id);
}
if (m && selector) {
m = m.querySelector(selector);
}
return m;
}
}
});
var cePolyfill = window.CustomElements && !CustomElements.useNative;
document.registerElement('dom-module', DomModule);
function forceDomModulesUpgrade() {
if (cePolyfill) {
var script = document._currentScript || document.currentScript;
var doc = script && script.ownerDocument || document;
var modules = doc.querySelectorAll('dom-module');
for (var i = modules.length - 1, m; i >= 0 && (m = modules[i]); i--) {
if (m.__upgraded__) {
return;
} else {
CustomElements.upgrade(m);
}
}
}
}
}());
Polymer.Base._addFeature({
_prepIs: function () {
if (!this.is) {
var module = (document._currentScript || document.currentScript).parentNode;
if (module.localName === 'dom-module') {
var id = module.id || module.getAttribute('name') || module.getAttribute('is');
this.is = id;
}
}
if (this.is) {
this.is = this.is.toLowerCase();
}
}
});
Polymer.Base._addFeature({
behaviors: [],
_desugarBehaviors: function () {
if (this.behaviors.length) {
this.behaviors = this._desugarSomeBehaviors(this.behaviors);
}
},
_desugarSomeBehaviors: function (behaviors) {
var behaviorSet = [];
behaviors = this._flattenBehaviorsList(behaviors);
for (var i = behaviors.length - 1; i >= 0; i--) {
var b = behaviors[i];
if (behaviorSet.indexOf(b) === -1) {
this._mixinBehavior(b);
behaviorSet.unshift(b);
}
}
return behaviorSet;
},
_flattenBehaviorsList: function (behaviors) {
var flat = [];
for (var i = 0; i < behaviors.length; i++) {
var b = behaviors[i];
if (b instanceof Array) {
flat = flat.concat(this._flattenBehaviorsList(b));
} else if (b) {
flat.push(b);
} else {
this._warn(this._logf('_flattenBehaviorsList', 'behavior is null, check for missing or 404 import'));
}
}
return flat;
},
_mixinBehavior: function (b) {
var n$ = Object.getOwnPropertyNames(b);
for (var i = 0, n; i < n$.length && (n = n$[i]); i++) {
if (!Polymer.Base._behaviorProperties[n] && !this.hasOwnProperty(n)) {
this.copyOwnProperty(n, b, this);
}
}
},
_prepBehaviors: function () {
this._prepFlattenedBehaviors(this.behaviors);
},
_prepFlattenedBehaviors: function (behaviors) {
for (var i = 0, l = behaviors.length; i < l; i++) {
this._prepBehavior(behaviors[i]);
}
this._prepBehavior(this);
},
_doBehavior: function (name, args) {
for (var i = 0; i < this.behaviors.length; i++) {
this._invokeBehavior(this.behaviors[i], name, args);
}
this._invokeBehavior(this, name, args);
},
_invokeBehavior: function (b, name, args) {
var fn = b[name];
if (fn) {
fn.apply(this, args || Polymer.nar);
}
},
_marshalBehaviors: function () {
for (var i = 0; i < this.behaviors.length; i++) {
this._marshalBehavior(this.behaviors[i]);
}
this._marshalBehavior(this);
}
});
Polymer.Base._behaviorProperties = {
hostAttributes: true,
beforeRegister: true,
registered: true,
properties: true,
observers: true,
listeners: true,
created: true,
attached: true,
detached: true,
attributeChanged: true,
ready: true
};
Polymer.Base._addFeature({
_getExtendedPrototype: function (tag) {
return this._getExtendedNativePrototype(tag);
},
_nativePrototypes: {},
_getExtendedNativePrototype: function (tag) {
var p = this._nativePrototypes[tag];
if (!p) {
var np = this.getNativePrototype(tag);
p = this.extend(Object.create(np), Polymer.Base);
this._nativePrototypes[tag] = p;
}
return p;
},
getNativePrototype: function (tag) {
return Object.getPrototypeOf(document.createElement(tag));
}
});
Polymer.Base._addFeature({
_prepConstructor: function () {
this._factoryArgs = this.extends ? [
this.extends,
this.is
] : [this.is];
var ctor = function () {
return this._factory(arguments);
};
if (this.hasOwnProperty('extends')) {
ctor.extends = this.extends;
}
Object.defineProperty(this, 'constructor', {
value: ctor,
writable: true,
configurable: true
});
ctor.prototype = this;
},
_factory: function (args) {
var elt = document.createElement.apply(document, this._factoryArgs);
if (this.factoryImpl) {
this.factoryImpl.apply(elt, args);
}
return elt;
}
});
Polymer.nob = Object.create(null);
Polymer.Base._addFeature({
properties: {},
getPropertyInfo: function (property) {
var info = this._getPropertyInfo(property, this.properties);
if (!info) {
for (var i = 0; i < this.behaviors.length; i++) {
info = this._getPropertyInfo(property, this.behaviors[i].properties);
if (info) {
return info;
}
}
}
return info || Polymer.nob;
},
_getPropertyInfo: function (property, properties) {
var p = properties && properties[property];
if (typeof p === 'function') {
p = properties[property] = { type: p };
}
if (p) {
p.defined = true;
}
return p;
},
_prepPropertyInfo: function () {
this._propertyInfo = {};
for (var i = 0; i < this.behaviors.length; i++) {
this._addPropertyInfo(this._propertyInfo, this.behaviors[i].properties);
}
this._addPropertyInfo(this._propertyInfo, this.properties);
this._addPropertyInfo(this._propertyInfo, this._propertyEffects);
},
_addPropertyInfo: function (target, source) {
if (source) {
var t, s;
for (var i in source) {
t = target[i];
s = source[i];
if (i[0] === '_' && !s.readOnly) {
continue;
}
if (!target[i]) {
target[i] = {
type: typeof s === 'function' ? s : s.type,
readOnly: s.readOnly,
attribute: Polymer.CaseMap.camelToDashCase(i)
};
} else {
if (!t.type) {
t.type = s.type;
}
if (!t.readOnly) {
t.readOnly = s.readOnly;
}
}
}
}
}
});
Polymer.CaseMap = {
_caseMap: {},
_rx: {
dashToCamel: /-[a-z]/g,
camelToDash: /([A-Z])/g
},
dashToCamelCase: function (dash) {
return this._caseMap[dash] || (this._caseMap[dash] = dash.indexOf('-') < 0 ? dash : dash.replace(this._rx.dashToCamel, function (m) {
return m[1].toUpperCase();
}));
},
camelToDashCase: function (camel) {
return this._caseMap[camel] || (this._caseMap[camel] = camel.replace(this._rx.camelToDash, '-$1').toLowerCase());
}
};
Polymer.Base._addFeature({
_addHostAttributes: function (attributes) {
if (!this._aggregatedAttributes) {
this._aggregatedAttributes = {};
}
if (attributes) {
this.mixin(this._aggregatedAttributes, attributes);
}
},
_marshalHostAttributes: function () {
if (this._aggregatedAttributes) {
this._applyAttributes(this, this._aggregatedAttributes);
}
},
_applyAttributes: function (node, attr$) {
for (var n in attr$) {
if (!this.hasAttribute(n) && n !== 'class') {
var v = attr$[n];
this.serializeValueToAttribute(v, n, this);
}
}
},
_marshalAttributes: function () {
this._takeAttributesToModel(this);
},
_takeAttributesToModel: function (model) {
if (this.hasAttributes()) {
for (var i in this._propertyInfo) {
var info = this._propertyInfo[i];
if (this.hasAttribute(info.attribute)) {
this._setAttributeToProperty(model, info.attribute, i, info);
}
}
}
},
_setAttributeToProperty: function (model, attribute, property, info) {
if (!this._serializing) {
property = property || Polymer.CaseMap.dashToCamelCase(attribute);
info = info || this._propertyInfo && this._propertyInfo[property];
if (info && !info.readOnly) {
var v = this.getAttribute(attribute);
model[property] = this.deserialize(v, info.type);
}
}
},
_serializing: false,
reflectPropertyToAttribute: function (property, attribute, value) {
this._serializing = true;
value = value === undefined ? this[property] : value;
this.serializeValueToAttribute(value, attribute || Polymer.CaseMap.camelToDashCase(property));
this._serializing = false;
},
serializeValueToAttribute: function (value, attribute, node) {
var str = this.serialize(value);
node = node || this;
if (str === undefined) {
node.removeAttribute(attribute);
} else {
node.setAttribute(attribute, str);
}
},
deserialize: function (value, type) {
switch (type) {
case Number:
value = Number(value);
break;
case Boolean:
value = value != null;
break;
case Object:
try {
value = JSON.parse(value);
} catch (x) {
}
break;
case Array:
try {
value = JSON.parse(value);
} catch (x) {
value = null;
console.warn('Polymer::Attributes: couldn`t decode Array as JSON');
}
break;
case Date:
value = new Date(value);
break;
case String:
default:
break;
}
return value;
},
serialize: function (value) {
switch (typeof value) {
case 'boolean':
return value ? '' : undefined;
case 'object':
if (value instanceof Date) {
return value.toString();
} else if (value) {
try {
return JSON.stringify(value);
} catch (x) {
return '';
}
}
default:
return value != null ? value : undefined;
}
}
});
Polymer.version = '1.4.0';
Polymer.Base._addFeature({
_registerFeatures: function () {
this._prepIs();
this._prepBehaviors();
this._prepConstructor();
this._prepPropertyInfo();
},
_prepBehavior: function (b) {
this._addHostAttributes(b.hostAttributes);
},
_marshalBehavior: function (b) {
},
_initFeatures: function () {
this._marshalHostAttributes();
this._marshalBehaviors();
}
});
Polymer.Base._addFeature({
_prepTemplate: function () {
if (this._template === undefined) {
this._template = Polymer.DomModule.import(this.is, 'template');
}
if (this._template && this._template.hasAttribute('is')) {
this._warn(this._logf('_prepTemplate', 'top-level Polymer template ' + 'must not be a type-extension, found', this._template, 'Move inside simple <template>.'));
}
if (this._template && !this._template.content && window.HTMLTemplateElement && HTMLTemplateElement.decorate) {
HTMLTemplateElement.decorate(this._template);
}
},
_stampTemplate: function () {
if (this._template) {
this.root = this.instanceTemplate(this._template);
}
},
instanceTemplate: function (template) {
var dom = document.importNode(template._content || template.content, true);
return dom;
}
});
(function () {
var baseAttachedCallback = Polymer.Base.attachedCallback;
Polymer.Base._addFeature({
_hostStack: [],
ready: function () {
},
_registerHost: function (host) {
this.dataHost = host = host || Polymer.Base._hostStack[Polymer.Base._hostStack.length - 1];
if (host && host._clients) {
host._clients.push(this);
}
this._clients = null;
this._clientsReadied = false;
},
_beginHosting: function () {
Polymer.Base._hostStack.push(this);
if (!this._clients) {
this._clients = [];
}
},
_endHosting: function () {
Polymer.Base._hostStack.pop();
},
_tryReady: function () {
this._readied = false;
if (this._canReady()) {
this._ready();
}
},
_canReady: function () {
return !this.dataHost || this.dataHost._clientsReadied;
},
_ready: function () {
this._beforeClientsReady();
if (this._template) {
this._setupRoot();
this._readyClients();
}
this._clientsReadied = true;
this._clients = null;
this._afterClientsReady();
this._readySelf();
},
_readyClients: function () {
this._beginDistribute();
var c$ = this._clients;
if (c$) {
for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
c._ready();
}
}
this._finishDistribute();
},
_readySelf: function () {
this._doBehavior('ready');
this._readied = true;
if (this._attachedPending) {
this._attachedPending = false;
this.attachedCallback();
}
},
_beforeClientsReady: function () {
},
_afterClientsReady: function () {
},
_beforeAttached: function () {
},
attachedCallback: function () {
if (this._readied) {
this._beforeAttached();
baseAttachedCallback.call(this);
} else {
this._attachedPending = true;
}
}
});
}());
Polymer.ArraySplice = function () {
function newSplice(index, removed, addedCount) {
return {
index: index,
removed: removed,
addedCount: addedCount
};
}
var EDIT_LEAVE = 0;
var EDIT_UPDATE = 1;
var EDIT_ADD = 2;
var EDIT_DELETE = 3;
function ArraySplice() {
}
ArraySplice.prototype = {
calcEditDistances: function (current, currentStart, currentEnd, old, oldStart, oldEnd) {
var rowCount = oldEnd - oldStart + 1;
var columnCount = currentEnd - currentStart + 1;
var distances = new Array(rowCount);
for (var i = 0; i < rowCount; i++) {
distances[i] = new Array(columnCount);
distances[i][0] = i;
}
for (var j = 0; j < columnCount; j++)
distances[0][j] = j;
for (i = 1; i < rowCount; i++) {
for (j = 1; j < columnCount; j++) {
if (this.equals(current[currentStart + j - 1], old[oldStart + i - 1]))
distances[i][j] = distances[i - 1][j - 1];
else {
var north = distances[i - 1][j] + 1;
var west = distances[i][j - 1] + 1;
distances[i][j] = north < west ? north : west;
}
}
}
return distances;
},
spliceOperationsFromEditDistances: function (distances) {
var i = distances.length - 1;
var j = distances[0].length - 1;
var current = distances[i][j];
var edits = [];
while (i > 0 || j > 0) {
if (i == 0) {
edits.push(EDIT_ADD);
j--;
continue;
}
if (j == 0) {
edits.push(EDIT_DELETE);
i--;
continue;
}
var northWest = distances[i - 1][j - 1];
var west = distances[i - 1][j];
var north = distances[i][j - 1];
var min;
if (west < north)
min = west < northWest ? west : northWest;
else
min = north < northWest ? north : northWest;
if (min == northWest) {
if (northWest == current) {
edits.push(EDIT_LEAVE);
} else {
edits.push(EDIT_UPDATE);
current = northWest;
}
i--;
j--;
} else if (min == west) {
edits.push(EDIT_DELETE);
i--;
current = west;
} else {
edits.push(EDIT_ADD);
j--;
current = north;
}
}
edits.reverse();
return edits;
},
calcSplices: function (current, currentStart, currentEnd, old, oldStart, oldEnd) {
var prefixCount = 0;
var suffixCount = 0;
var minLength = Math.min(currentEnd - currentStart, oldEnd - oldStart);
if (currentStart == 0 && oldStart == 0)
prefixCount = this.sharedPrefix(current, old, minLength);
if (currentEnd == current.length && oldEnd == old.length)
suffixCount = this.sharedSuffix(current, old, minLength - prefixCount);
currentStart += prefixCount;
oldStart += prefixCount;
currentEnd -= suffixCount;
oldEnd -= suffixCount;
if (currentEnd - currentStart == 0 && oldEnd - oldStart == 0)
return [];
if (currentStart == currentEnd) {
var splice = newSplice(currentStart, [], 0);
while (oldStart < oldEnd)
splice.removed.push(old[oldStart++]);
return [splice];
} else if (oldStart == oldEnd)
return [newSplice(currentStart, [], currentEnd - currentStart)];
var ops = this.spliceOperationsFromEditDistances(this.calcEditDistances(current, currentStart, currentEnd, old, oldStart, oldEnd));
splice = undefined;
var splices = [];
var index = currentStart;
var oldIndex = oldStart;
for (var i = 0; i < ops.length; i++) {
switch (ops[i]) {
case EDIT_LEAVE:
if (splice) {
splices.push(splice);
splice = undefined;
}
index++;
oldIndex++;
break;
case EDIT_UPDATE:
if (!splice)
splice = newSplice(index, [], 0);
splice.addedCount++;
index++;
splice.removed.push(old[oldIndex]);
oldIndex++;
break;
case EDIT_ADD:
if (!splice)
splice = newSplice(index, [], 0);
splice.addedCount++;
index++;
break;
case EDIT_DELETE:
if (!splice)
splice = newSplice(index, [], 0);
splice.removed.push(old[oldIndex]);
oldIndex++;
break;
}
}
if (splice) {
splices.push(splice);
}
return splices;
},
sharedPrefix: function (current, old, searchLength) {
for (var i = 0; i < searchLength; i++)
if (!this.equals(current[i], old[i]))
return i;
return searchLength;
},
sharedSuffix: function (current, old, searchLength) {
var index1 = current.length;
var index2 = old.length;
var count = 0;
while (count < searchLength && this.equals(current[--index1], old[--index2]))
count++;
return count;
},
calculateSplices: function (current, previous) {
return this.calcSplices(current, 0, current.length, previous, 0, previous.length);
},
equals: function (currentValue, previousValue) {
return currentValue === previousValue;
}
};
return new ArraySplice();
}();
Polymer.domInnerHTML = function () {
var escapeAttrRegExp = /[&\u00A0"]/g;
var escapeDataRegExp = /[&\u00A0<>]/g;
function escapeReplace(c) {
switch (c) {
case '&':
return '&amp;';
case '<':
return '&lt;';
case '>':
return '&gt;';
case '"':
return '&quot;';
case '\xA0':
return '&nbsp;';
}
}
function escapeAttr(s) {
return s.replace(escapeAttrRegExp, escapeReplace);
}
function escapeData(s) {
return s.replace(escapeDataRegExp, escapeReplace);
}
function makeSet(arr) {
var set = {};
for (var i = 0; i < arr.length; i++) {
set[arr[i]] = true;
}
return set;
}
var voidElements = makeSet([
'area',
'base',
'br',
'col',
'command',
'embed',
'hr',
'img',
'input',
'keygen',
'link',
'meta',
'param',
'source',
'track',
'wbr'
]);
var plaintextParents = makeSet([
'style',
'script',
'xmp',
'iframe',
'noembed',
'noframes',
'plaintext',
'noscript'
]);
function getOuterHTML(node, parentNode, composed) {
switch (node.nodeType) {
case Node.ELEMENT_NODE:
var tagName = node.localName;
var s = '<' + tagName;
var attrs = node.attributes;
for (var i = 0, attr; attr = attrs[i]; i++) {
s += ' ' + attr.name + '="' + escapeAttr(attr.value) + '"';
}
s += '>';
if (voidElements[tagName]) {
return s;
}
return s + getInnerHTML(node, composed) + '</' + tagName + '>';
case Node.TEXT_NODE:
var data = node.data;
if (parentNode && plaintextParents[parentNode.localName]) {
return data;
}
return escapeData(data);
case Node.COMMENT_NODE:
return '<!--' + node.data + '-->';
default:
console.error(node);
throw new Error('not implemented');
}
}
function getInnerHTML(node, composed) {
if (node instanceof HTMLTemplateElement)
node = node.content;
var s = '';
var c$ = Polymer.dom(node).childNodes;
for (var i = 0, l = c$.length, child; i < l && (child = c$[i]); i++) {
s += getOuterHTML(child, node, composed);
}
return s;
}
return { getInnerHTML: getInnerHTML };
}();
(function () {
'use strict';
var nativeInsertBefore = Element.prototype.insertBefore;
var nativeAppendChild = Element.prototype.appendChild;
var nativeRemoveChild = Element.prototype.removeChild;
Polymer.TreeApi = {
arrayCopyChildNodes: function (parent) {
var copy = [], i = 0;
for (var n = parent.firstChild; n; n = n.nextSibling) {
copy[i++] = n;
}
return copy;
},
arrayCopyChildren: function (parent) {
var copy = [], i = 0;
for (var n = parent.firstElementChild; n; n = n.nextElementSibling) {
copy[i++] = n;
}
return copy;
},
arrayCopy: function (a$) {
var l = a$.length;
var copy = new Array(l);
for (var i = 0; i < l; i++) {
copy[i] = a$[i];
}
return copy;
}
};
Polymer.TreeApi.Logical = {
hasParentNode: function (node) {
return Boolean(node.__dom && node.__dom.parentNode);
},
hasChildNodes: function (node) {
return Boolean(node.__dom && node.__dom.childNodes !== undefined);
},
getChildNodes: function (node) {
return this.hasChildNodes(node) ? this._getChildNodes(node) : node.childNodes;
},
_getChildNodes: function (node) {
if (!node.__dom.childNodes) {
node.__dom.childNodes = [];
for (var n = node.__dom.firstChild; n; n = n.__dom.nextSibling) {
node.__dom.childNodes.push(n);
}
}
return node.__dom.childNodes;
},
getParentNode: function (node) {
return node.__dom && node.__dom.parentNode !== undefined ? node.__dom.parentNode : node.parentNode;
},
getFirstChild: function (node) {
return node.__dom && node.__dom.firstChild !== undefined ? node.__dom.firstChild : node.firstChild;
},
getLastChild: function (node) {
return node.__dom && node.__dom.lastChild !== undefined ? node.__dom.lastChild : node.lastChild;
},
getNextSibling: function (node) {
return node.__dom && node.__dom.nextSibling !== undefined ? node.__dom.nextSibling : node.nextSibling;
},
getPreviousSibling: function (node) {
return node.__dom && node.__dom.previousSibling !== undefined ? node.__dom.previousSibling : node.previousSibling;
},
getFirstElementChild: function (node) {
return node.__dom && node.__dom.firstChild !== undefined ? this._getFirstElementChild(node) : node.firstElementChild;
},
_getFirstElementChild: function (node) {
var n = node.__dom.firstChild;
while (n && n.nodeType !== Node.ELEMENT_NODE) {
n = n.__dom.nextSibling;
}
return n;
},
getLastElementChild: function (node) {
return node.__dom && node.__dom.lastChild !== undefined ? this._getLastElementChild(node) : node.lastElementChild;
},
_getLastElementChild: function (node) {
var n = node.__dom.lastChild;
while (n && n.nodeType !== Node.ELEMENT_NODE) {
n = n.__dom.previousSibling;
}
return n;
},
getNextElementSibling: function (node) {
return node.__dom && node.__dom.nextSibling !== undefined ? this._getNextElementSibling(node) : node.nextElementSibling;
},
_getNextElementSibling: function (node) {
var n = node.__dom.nextSibling;
while (n && n.nodeType !== Node.ELEMENT_NODE) {
n = n.__dom.nextSibling;
}
return n;
},
getPreviousElementSibling: function (node) {
return node.__dom && node.__dom.previousSibling !== undefined ? this._getPreviousElementSibling(node) : node.previousElementSibling;
},
_getPreviousElementSibling: function (node) {
var n = node.__dom.previousSibling;
while (n && n.nodeType !== Node.ELEMENT_NODE) {
n = n.__dom.previousSibling;
}
return n;
},
saveChildNodes: function (node) {
if (!this.hasChildNodes(node)) {
node.__dom = node.__dom || {};
node.__dom.firstChild = node.firstChild;
node.__dom.lastChild = node.lastChild;
node.__dom.childNodes = [];
for (var n = node.firstChild; n; n = n.nextSibling) {
n.__dom = n.__dom || {};
n.__dom.parentNode = node;
node.__dom.childNodes.push(n);
n.__dom.nextSibling = n.nextSibling;
n.__dom.previousSibling = n.previousSibling;
}
}
},
recordInsertBefore: function (node, container, ref_node) {
container.__dom.childNodes = null;
if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
for (var n = node.firstChild; n; n = n.nextSibling) {
this._linkNode(n, container, ref_node);
}
} else {
this._linkNode(node, container, ref_node);
}
},
_linkNode: function (node, container, ref_node) {
node.__dom = node.__dom || {};
container.__dom = container.__dom || {};
if (ref_node) {
ref_node.__dom = ref_node.__dom || {};
}
node.__dom.previousSibling = ref_node ? ref_node.__dom.previousSibling : container.__dom.lastChild;
if (node.__dom.previousSibling) {
node.__dom.previousSibling.__dom.nextSibling = node;
}
node.__dom.nextSibling = ref_node;
if (node.__dom.nextSibling) {
node.__dom.nextSibling.__dom.previousSibling = node;
}
node.__dom.parentNode = container;
if (ref_node) {
if (ref_node === container.__dom.firstChild) {
container.__dom.firstChild = node;
}
} else {
container.__dom.lastChild = node;
if (!container.__dom.firstChild) {
container.__dom.firstChild = node;
}
}
container.__dom.childNodes = null;
},
recordRemoveChild: function (node, container) {
node.__dom = node.__dom || {};
container.__dom = container.__dom || {};
if (node === container.__dom.firstChild) {
container.__dom.firstChild = node.__dom.nextSibling;
}
if (node === container.__dom.lastChild) {
container.__dom.lastChild = node.__dom.previousSibling;
}
var p = node.__dom.previousSibling;
var n = node.__dom.nextSibling;
if (p) {
p.__dom.nextSibling = n;
}
if (n) {
n.__dom.previousSibling = p;
}
node.__dom.parentNode = node.__dom.previousSibling = node.__dom.nextSibling = undefined;
container.__dom.childNodes = null;
}
};
Polymer.TreeApi.Composed = {
getChildNodes: function (node) {
return Polymer.TreeApi.arrayCopyChildNodes(node);
},
getParentNode: function (node) {
return node.parentNode;
},
clearChildNodes: function (node) {
node.textContent = '';
},
insertBefore: function (parentNode, newChild, refChild) {
return nativeInsertBefore.call(parentNode, newChild, refChild || null);
},
appendChild: function (parentNode, newChild) {
return nativeAppendChild.call(parentNode, newChild);
},
removeChild: function (parentNode, node) {
return nativeRemoveChild.call(parentNode, node);
}
};
}());
Polymer.DomApi = function () {
'use strict';
var Settings = Polymer.Settings;
var TreeApi = Polymer.TreeApi;
var DomApi = function (node) {
this.node = needsToWrap ? DomApi.wrap(node) : node;
};
var needsToWrap = Settings.hasShadow && !Settings.nativeShadow;
DomApi.wrap = window.wrap ? window.wrap : function (node) {
return node;
};
DomApi.prototype = {
flush: function () {
Polymer.dom.flush();
},
deepContains: function (node) {
if (this.node.contains(node)) {
return true;
}
var n = node;
var doc = node.ownerDocument;
while (n && n !== doc && n !== this.node) {
n = Polymer.dom(n).parentNode || n.host;
}
return n === this.node;
},
queryDistributedElements: function (selector) {
var c$ = this.getEffectiveChildNodes();
var list = [];
for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
if (c.nodeType === Node.ELEMENT_NODE && DomApi.matchesSelector.call(c, selector)) {
list.push(c);
}
}
return list;
},
getEffectiveChildNodes: function () {
var list = [];
var c$ = this.childNodes;
for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
if (c.localName === CONTENT) {
var d$ = dom(c).getDistributedNodes();
for (var j = 0; j < d$.length; j++) {
list.push(d$[j]);
}
} else {
list.push(c);
}
}
return list;
},
observeNodes: function (callback) {
if (callback) {
if (!this.observer) {
this.observer = this.node.localName === CONTENT ? new DomApi.DistributedNodesObserver(this) : new DomApi.EffectiveNodesObserver(this);
}
return this.observer.addListener(callback);
}
},
unobserveNodes: function (handle) {
if (this.observer) {
this.observer.removeListener(handle);
}
},
notifyObserver: function () {
if (this.observer) {
this.observer.notify();
}
},
_query: function (matcher, node, halter) {
node = node || this.node;
var list = [];
this._queryElements(TreeApi.Logical.getChildNodes(node), matcher, halter, list);
return list;
},
_queryElements: function (elements, matcher, halter, list) {
for (var i = 0, l = elements.length, c; i < l && (c = elements[i]); i++) {
if (c.nodeType === Node.ELEMENT_NODE) {
if (this._queryElement(c, matcher, halter, list)) {
return true;
}
}
}
},
_queryElement: function (node, matcher, halter, list) {
var result = matcher(node);
if (result) {
list.push(node);
}
if (halter && halter(result)) {
return result;
}
this._queryElements(TreeApi.Logical.getChildNodes(node), matcher, halter, list);
}
};
var CONTENT = DomApi.CONTENT = 'content';
var dom = DomApi.factory = function (node) {
node = node || document;
if (!node.__domApi) {
node.__domApi = new DomApi.ctor(node);
}
return node.__domApi;
};
DomApi.hasApi = function (node) {
return Boolean(node.__domApi);
};
DomApi.ctor = DomApi;
Polymer.dom = function (obj, patch) {
if (obj instanceof Event) {
return Polymer.EventApi.factory(obj);
} else {
return DomApi.factory(obj, patch);
}
};
var p = Element.prototype;
DomApi.matchesSelector = p.matches || p.matchesSelector || p.mozMatchesSelector || p.msMatchesSelector || p.oMatchesSelector || p.webkitMatchesSelector;
return DomApi;
}();
(function () {
'use strict';
var Settings = Polymer.Settings;
var DomApi = Polymer.DomApi;
var dom = DomApi.factory;
var TreeApi = Polymer.TreeApi;
var getInnerHTML = Polymer.domInnerHTML.getInnerHTML;
var CONTENT = DomApi.CONTENT;
if (Settings.useShadow) {
return;
}
var nativeCloneNode = Element.prototype.cloneNode;
var nativeImportNode = Document.prototype.importNode;
Polymer.Base.extend(DomApi.prototype, {
_lazyDistribute: function (host) {
if (host.shadyRoot && host.shadyRoot._distributionClean) {
host.shadyRoot._distributionClean = false;
Polymer.dom.addDebouncer(host.debounce('_distribute', host._distributeContent));
}
},
appendChild: function (node) {
return this.insertBefore(node);
},
insertBefore: function (node, ref_node) {
if (ref_node && TreeApi.Logical.getParentNode(ref_node) !== this.node) {
throw Error('The ref_node to be inserted before is not a child ' + 'of this node');
}
if (node.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) {
var parent = TreeApi.Logical.getParentNode(node);
if (parent) {
if (DomApi.hasApi(parent)) {
dom(parent).notifyObserver();
}
this._removeNode(node);
} else {
this._removeOwnerShadyRoot(node);
}
}
if (!this._addNode(node, ref_node)) {
if (ref_node) {
ref_node = ref_node.localName === CONTENT ? this._firstComposedNode(ref_node) : ref_node;
}
var container = this.node._isShadyRoot ? this.node.host : this.node;
if (ref_node) {
TreeApi.Composed.insertBefore(container, node, ref_node);
} else {
TreeApi.Composed.appendChild(container, node);
}
}
this.notifyObserver();
return node;
},
_addNode: function (node, ref_node) {
var root = this.getOwnerRoot();
if (root) {
var ipAdded = this._maybeAddInsertionPoint(node, this.node);
if (!root._invalidInsertionPoints) {
root._invalidInsertionPoints = ipAdded;
}
this._addNodeToHost(root.host, node);
}
if (TreeApi.Logical.hasChildNodes(this.node)) {
TreeApi.Logical.recordInsertBefore(node, this.node, ref_node);
}
var handled = this._maybeDistribute(node) || this.node.shadyRoot;
if (handled) {
if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
while (node.firstChild) {
TreeApi.Composed.removeChild(node, node.firstChild);
}
} else {
var parent = TreeApi.Composed.getParentNode(node);
if (parent) {
TreeApi.Composed.removeChild(parent, node);
}
}
}
return handled;
},
removeChild: function (node) {
if (TreeApi.Logical.getParentNode(node) !== this.node) {
throw Error('The node to be removed is not a child of this node: ' + node);
}
if (!this._removeNode(node)) {
var container = this.node._isShadyRoot ? this.node.host : this.node;
var parent = TreeApi.Composed.getParentNode(node);
if (container === parent) {
TreeApi.Composed.removeChild(container, node);
}
}
this.notifyObserver();
return node;
},
_removeNode: function (node) {
var logicalParent = TreeApi.Logical.hasParentNode(node) && TreeApi.Logical.getParentNode(node);
var distributed;
var root = this._ownerShadyRootForNode(node);
if (logicalParent) {
distributed = dom(node)._maybeDistributeParent();
TreeApi.Logical.recordRemoveChild(node, logicalParent);
if (root && this._removeDistributedChildren(root, node)) {
root._invalidInsertionPoints = true;
this._lazyDistribute(root.host);
}
}
this._removeOwnerShadyRoot(node);
if (root) {
this._removeNodeFromHost(root.host, node);
}
return distributed;
},
replaceChild: function (node, ref_node) {
this.insertBefore(node, ref_node);
this.removeChild(ref_node);
return node;
},
_hasCachedOwnerRoot: function (node) {
return Boolean(node._ownerShadyRoot !== undefined);
},
getOwnerRoot: function () {
return this._ownerShadyRootForNode(this.node);
},
_ownerShadyRootForNode: function (node) {
if (!node) {
return;
}
var root = node._ownerShadyRoot;
if (root === undefined) {
if (node._isShadyRoot) {
root = node;
} else {
var parent = TreeApi.Logical.getParentNode(node);
if (parent) {
root = parent._isShadyRoot ? parent : this._ownerShadyRootForNode(parent);
} else {
root = null;
}
}
if (root || document.documentElement.contains(node)) {
node._ownerShadyRoot = root;
}
}
return root;
},
_maybeDistribute: function (node) {
var fragContent = node.nodeType === Node.DOCUMENT_FRAGMENT_NODE && !node.__noContent && dom(node).querySelector(CONTENT);
var wrappedContent = fragContent && TreeApi.Logical.getParentNode(fragContent).nodeType !== Node.DOCUMENT_FRAGMENT_NODE;
var hasContent = fragContent || node.localName === CONTENT;
if (hasContent) {
var root = this.getOwnerRoot();
if (root) {
this._lazyDistribute(root.host);
}
}
var needsDist = this._nodeNeedsDistribution(this.node);
if (needsDist) {
this._lazyDistribute(this.node);
}
return needsDist || hasContent && !wrappedContent;
},
_maybeAddInsertionPoint: function (node, parent) {
var added;
if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE && !node.__noContent) {
var c$ = dom(node).querySelectorAll(CONTENT);
for (var i = 0, n, np, na; i < c$.length && (n = c$[i]); i++) {
np = TreeApi.Logical.getParentNode(n);
if (np === node) {
np = parent;
}
na = this._maybeAddInsertionPoint(n, np);
added = added || na;
}
} else if (node.localName === CONTENT) {
TreeApi.Logical.saveChildNodes(parent);
TreeApi.Logical.saveChildNodes(node);
added = true;
}
return added;
},
_updateInsertionPoints: function (host) {
var i$ = host.shadyRoot._insertionPoints = dom(host.shadyRoot).querySelectorAll(CONTENT);
for (var i = 0, c; i < i$.length; i++) {
c = i$[i];
TreeApi.Logical.saveChildNodes(c);
TreeApi.Logical.saveChildNodes(TreeApi.Logical.getParentNode(c));
}
},
_nodeNeedsDistribution: function (node) {
return node && node.shadyRoot && DomApi.hasInsertionPoint(node.shadyRoot);
},
_addNodeToHost: function (host, node) {
if (host._elementAdd) {
host._elementAdd(node);
}
},
_removeNodeFromHost: function (host, node) {
if (host._elementRemove) {
host._elementRemove(node);
}
},
_removeDistributedChildren: function (root, container) {
var hostNeedsDist;
var ip$ = root._insertionPoints;
for (var i = 0; i < ip$.length; i++) {
var content = ip$[i];
if (this._contains(container, content)) {
var dc$ = dom(content).getDistributedNodes();
for (var j = 0; j < dc$.length; j++) {
hostNeedsDist = true;
var node = dc$[j];
var parent = TreeApi.Composed.getParentNode(node);
if (parent) {
TreeApi.Composed.removeChild(parent, node);
}
}
}
}
return hostNeedsDist;
},
_contains: function (container, node) {
while (node) {
if (node == container) {
return true;
}
node = TreeApi.Logical.getParentNode(node);
}
},
_removeOwnerShadyRoot: function (node) {
if (this._hasCachedOwnerRoot(node)) {
var c$ = TreeApi.Logical.getChildNodes(node);
for (var i = 0, l = c$.length, n; i < l && (n = c$[i]); i++) {
this._removeOwnerShadyRoot(n);
}
}
node._ownerShadyRoot = undefined;
},
_firstComposedNode: function (content) {
var n$ = dom(content).getDistributedNodes();
for (var i = 0, l = n$.length, n, p$; i < l && (n = n$[i]); i++) {
p$ = dom(n).getDestinationInsertionPoints();
if (p$[p$.length - 1] === content) {
return n;
}
}
},
querySelector: function (selector) {
var result = this._query(function (n) {
return DomApi.matchesSelector.call(n, selector);
}, this.node, function (n) {
return Boolean(n);
})[0];
return result || null;
},
querySelectorAll: function (selector) {
return this._query(function (n) {
return DomApi.matchesSelector.call(n, selector);
}, this.node);
},
getDestinationInsertionPoints: function () {
return this.node._destinationInsertionPoints || [];
},
getDistributedNodes: function () {
return this.node._distributedNodes || [];
},
_clear: function () {
while (this.childNodes.length) {
this.removeChild(this.childNodes[0]);
}
},
setAttribute: function (name, value) {
this.node.setAttribute(name, value);
this._maybeDistributeParent();
},
removeAttribute: function (name) {
this.node.removeAttribute(name);
this._maybeDistributeParent();
},
_maybeDistributeParent: function () {
if (this._nodeNeedsDistribution(this.parentNode)) {
this._lazyDistribute(this.parentNode);
return true;
}
},
cloneNode: function (deep) {
var n = nativeCloneNode.call(this.node, false);
if (deep) {
var c$ = this.childNodes;
var d = dom(n);
for (var i = 0, nc; i < c$.length; i++) {
nc = dom(c$[i]).cloneNode(true);
d.appendChild(nc);
}
}
return n;
},
importNode: function (externalNode, deep) {
var doc = this.node instanceof Document ? this.node : this.node.ownerDocument;
var n = nativeImportNode.call(doc, externalNode, false);
if (deep) {
var c$ = TreeApi.Logical.getChildNodes(externalNode);
var d = dom(n);
for (var i = 0, nc; i < c$.length; i++) {
nc = dom(doc).importNode(c$[i], true);
d.appendChild(nc);
}
}
return n;
},
_getComposedInnerHTML: function () {
return getInnerHTML(this.node, true);
}
});
Object.defineProperties(DomApi.prototype, {
activeElement: {
get: function () {
var active = document.activeElement;
if (!active) {
return null;
}
var isShadyRoot = !!this.node._isShadyRoot;
if (this.node !== document) {
if (!isShadyRoot) {
return null;
}
if (this.node.host === active || !this.node.host.contains(active)) {
return null;
}
}
var activeRoot = dom(active).getOwnerRoot();
while (activeRoot && activeRoot !== this.node) {
active = activeRoot.host;
activeRoot = dom(active).getOwnerRoot();
}
if (this.node === document) {
return activeRoot ? null : active;
} else {
return activeRoot === this.node ? active : null;
}
},
configurable: true
},
childNodes: {
get: function () {
var c$ = TreeApi.Logical.getChildNodes(this.node);
return Array.isArray(c$) ? c$ : TreeApi.arrayCopyChildNodes(this.node);
},
configurable: true
},
children: {
get: function () {
if (TreeApi.Logical.hasChildNodes(this.node)) {
return Array.prototype.filter.call(this.childNodes, function (n) {
return n.nodeType === Node.ELEMENT_NODE;
});
} else {
return TreeApi.arrayCopyChildren(this.node);
}
},
configurable: true
},
parentNode: {
get: function () {
return TreeApi.Logical.getParentNode(this.node);
},
configurable: true
},
firstChild: {
get: function () {
return TreeApi.Logical.getFirstChild(this.node);
},
configurable: true
},
lastChild: {
get: function () {
return TreeApi.Logical.getLastChild(this.node);
},
configurable: true
},
nextSibling: {
get: function () {
return TreeApi.Logical.getNextSibling(this.node);
},
configurable: true
},
previousSibling: {
get: function () {
return TreeApi.Logical.getPreviousSibling(this.node);
},
configurable: true
},
firstElementChild: {
get: function () {
return TreeApi.Logical.getFirstElementChild(this.node);
},
configurable: true
},
lastElementChild: {
get: function () {
return TreeApi.Logical.getLastElementChild(this.node);
},
configurable: true
},
nextElementSibling: {
get: function () {
return TreeApi.Logical.getNextElementSibling(this.node);
},
configurable: true
},
previousElementSibling: {
get: function () {
return TreeApi.Logical.getPreviousElementSibling(this.node);
},
configurable: true
},
textContent: {
get: function () {
var nt = this.node.nodeType;
if (nt === Node.TEXT_NODE || nt === Node.COMMENT_NODE) {
return this.node.textContent;
} else {
var tc = [];
for (var i = 0, cn = this.childNodes, c; c = cn[i]; i++) {
if (c.nodeType !== Node.COMMENT_NODE) {
tc.push(c.textContent);
}
}
return tc.join('');
}
},
set: function (text) {
var nt = this.node.nodeType;
if (nt === Node.TEXT_NODE || nt === Node.COMMENT_NODE) {
this.node.textContent = text;
} else {
this._clear();
if (text) {
this.appendChild(document.createTextNode(text));
}
}
},
configurable: true
},
innerHTML: {
get: function () {
var nt = this.node.nodeType;
if (nt === Node.TEXT_NODE || nt === Node.COMMENT_NODE) {
return null;
} else {
return getInnerHTML(this.node);
}
},
set: function (text) {
var nt = this.node.nodeType;
if (nt !== Node.TEXT_NODE || nt !== Node.COMMENT_NODE) {
this._clear();
var d = document.createElement('div');
d.innerHTML = text;
var c$ = TreeApi.arrayCopyChildNodes(d);
for (var i = 0; i < c$.length; i++) {
this.appendChild(c$[i]);
}
}
},
configurable: true
}
});
DomApi.hasInsertionPoint = function (root) {
return Boolean(root && root._insertionPoints.length);
};
}());
(function () {
'use strict';
var Settings = Polymer.Settings;
var TreeApi = Polymer.TreeApi;
var DomApi = Polymer.DomApi;
if (!Settings.useShadow) {
return;
}
Polymer.Base.extend(DomApi.prototype, {
querySelectorAll: function (selector) {
return TreeApi.arrayCopy(this.node.querySelectorAll(selector));
},
getOwnerRoot: function () {
var n = this.node;
while (n) {
if (n.nodeType === Node.DOCUMENT_FRAGMENT_NODE && n.host) {
return n;
}
n = n.parentNode;
}
},
importNode: function (externalNode, deep) {
var doc = this.node instanceof Document ? this.node : this.node.ownerDocument;
return doc.importNode(externalNode, deep);
},
getDestinationInsertionPoints: function () {
var n$ = this.node.getDestinationInsertionPoints && this.node.getDestinationInsertionPoints();
return n$ ? TreeApi.arrayCopy(n$) : [];
},
getDistributedNodes: function () {
var n$ = this.node.getDistributedNodes && this.node.getDistributedNodes();
return n$ ? TreeApi.arrayCopy(n$) : [];
}
});
Object.defineProperties(DomApi.prototype, {
activeElement: {
get: function () {
var node = DomApi.wrap(this.node);
var activeElement = node.activeElement;
return node.contains(activeElement) ? activeElement : null;
},
configurable: true
},
childNodes: {
get: function () {
return TreeApi.arrayCopyChildNodes(this.node);
},
configurable: true
},
children: {
get: function () {
return TreeApi.arrayCopyChildren(this.node);
},
configurable: true
},
textContent: {
get: function () {
return this.node.textContent;
},
set: function (value) {
return this.node.textContent = value;
},
configurable: true
},
innerHTML: {
get: function () {
return this.node.innerHTML;
},
set: function (value) {
return this.node.innerHTML = value;
},
configurable: true
}
});
var forwardMethods = function (m$) {
for (var i = 0; i < m$.length; i++) {
forwardMethod(m$[i]);
}
};
var forwardMethod = function (method) {
DomApi.prototype[method] = function () {
return this.node[method].apply(this.node, arguments);
};
};
forwardMethods([
'cloneNode',
'appendChild',
'insertBefore',
'removeChild',
'replaceChild',
'setAttribute',
'removeAttribute',
'querySelector'
]);
var forwardProperties = function (f$) {
for (var i = 0; i < f$.length; i++) {
forwardProperty(f$[i]);
}
};
var forwardProperty = function (name) {
Object.defineProperty(DomApi.prototype, name, {
get: function () {
return this.node[name];
},
configurable: true
});
};
forwardProperties([
'parentNode',
'firstChild',
'lastChild',
'nextSibling',
'previousSibling',
'firstElementChild',
'lastElementChild',
'nextElementSibling',
'previousElementSibling'
]);
}());
Polymer.Base.extend(Polymer.dom, {
_flushGuard: 0,
_FLUSH_MAX: 100,
_needsTakeRecords: !Polymer.Settings.useNativeCustomElements,
_debouncers: [],
_staticFlushList: [],
_finishDebouncer: null,
flush: function () {
this._flushGuard = 0;
this._prepareFlush();
while (this._debouncers.length && this._flushGuard < this._FLUSH_MAX) {
while (this._debouncers.length) {
this._debouncers.shift().complete();
}
if (this._finishDebouncer) {
this._finishDebouncer.complete();
}
this._prepareFlush();
this._flushGuard++;
}
if (this._flushGuard >= this._FLUSH_MAX) {
console.warn('Polymer.dom.flush aborted. Flush may not be complete.');
}
},
_prepareFlush: function () {
if (this._needsTakeRecords) {
CustomElements.takeRecords();
}
for (var i = 0; i < this._staticFlushList.length; i++) {
this._staticFlushList[i]();
}
},
addStaticFlush: function (fn) {
this._staticFlushList.push(fn);
},
removeStaticFlush: function (fn) {
var i = this._staticFlushList.indexOf(fn);
if (i >= 0) {
this._staticFlushList.splice(i, 1);
}
},
addDebouncer: function (debouncer) {
this._debouncers.push(debouncer);
this._finishDebouncer = Polymer.Debounce(this._finishDebouncer, this._finishFlush);
},
_finishFlush: function () {
Polymer.dom._debouncers = [];
}
});
Polymer.EventApi = function () {
'use strict';
var DomApi = Polymer.DomApi.ctor;
var Settings = Polymer.Settings;
DomApi.Event = function (event) {
this.event = event;
};
if (Settings.useShadow) {
DomApi.Event.prototype = {
get rootTarget() {
return this.event.path[0];
},
get localTarget() {
return this.event.target;
},
get path() {
var path = this.event.path;
if (!Array.isArray(path)) {
path = Array.prototype.slice.call(path);
}
return path;
}
};
} else {
DomApi.Event.prototype = {
get rootTarget() {
return this.event.target;
},
get localTarget() {
var current = this.event.currentTarget;
var currentRoot = current && Polymer.dom(current).getOwnerRoot();
var p$ = this.path;
for (var i = 0; i < p$.length; i++) {
if (Polymer.dom(p$[i]).getOwnerRoot() === currentRoot) {
return p$[i];
}
}
},
get path() {
if (!this.event._path) {
var path = [];
var current = this.rootTarget;
while (current) {
path.push(current);
var insertionPoints = Polymer.dom(current).getDestinationInsertionPoints();
if (insertionPoints.length) {
for (var i = 0; i < insertionPoints.length - 1; i++) {
path.push(insertionPoints[i]);
}
current = insertionPoints[insertionPoints.length - 1];
} else {
current = Polymer.dom(current).parentNode || current.host;
}
}
path.push(window);
this.event._path = path;
}
return this.event._path;
}
};
}
var factory = function (event) {
if (!event.__eventApi) {
event.__eventApi = new DomApi.Event(event);
}
return event.__eventApi;
};
return { factory: factory };
}();
(function () {
'use strict';
var DomApi = Polymer.DomApi.ctor;
var useShadow = Polymer.Settings.useShadow;
Object.defineProperty(DomApi.prototype, 'classList', {
get: function () {
if (!this._classList) {
this._classList = new DomApi.ClassList(this);
}
return this._classList;
},
configurable: true
});
DomApi.ClassList = function (host) {
this.domApi = host;
this.node = host.node;
};
DomApi.ClassList.prototype = {
add: function () {
this.node.classList.add.apply(this.node.classList, arguments);
this._distributeParent();
},
remove: function () {
this.node.classList.remove.apply(this.node.classList, arguments);
this._distributeParent();
},
toggle: function () {
this.node.classList.toggle.apply(this.node.classList, arguments);
this._distributeParent();
},
_distributeParent: function () {
if (!useShadow) {
this.domApi._maybeDistributeParent();
}
},
contains: function () {
return this.node.classList.contains.apply(this.node.classList, arguments);
}
};
}());
(function () {
'use strict';
var DomApi = Polymer.DomApi.ctor;
var Settings = Polymer.Settings;
DomApi.EffectiveNodesObserver = function (domApi) {
this.domApi = domApi;
this.node = this.domApi.node;
this._listeners = [];
};
DomApi.EffectiveNodesObserver.prototype = {
addListener: function (callback) {
if (!this._isSetup) {
this._setup();
this._isSetup = true;
}
var listener = {
fn: callback,
_nodes: []
};
this._listeners.push(listener);
this._scheduleNotify();
return listener;
},
removeListener: function (handle) {
var i = this._listeners.indexOf(handle);
if (i >= 0) {
this._listeners.splice(i, 1);
handle._nodes = [];
}
if (!this._hasListeners()) {
this._cleanup();
this._isSetup = false;
}
},
_setup: function () {
this._observeContentElements(this.domApi.childNodes);
},
_cleanup: function () {
this._unobserveContentElements(this.domApi.childNodes);
},
_hasListeners: function () {
return Boolean(this._listeners.length);
},
_scheduleNotify: function () {
if (this._debouncer) {
this._debouncer.stop();
}
this._debouncer = Polymer.Debounce(this._debouncer, this._notify);
this._debouncer.context = this;
Polymer.dom.addDebouncer(this._debouncer);
},
notify: function () {
if (this._hasListeners()) {
this._scheduleNotify();
}
},
_notify: function () {
this._beforeCallListeners();
this._callListeners();
},
_beforeCallListeners: function () {
this._updateContentElements();
},
_updateContentElements: function () {
this._observeContentElements(this.domApi.childNodes);
},
_observeContentElements: function (elements) {
for (var i = 0, n; i < elements.length && (n = elements[i]); i++) {
if (this._isContent(n)) {
n.__observeNodesMap = n.__observeNodesMap || new WeakMap();
if (!n.__observeNodesMap.has(this)) {
n.__observeNodesMap.set(this, this._observeContent(n));
}
}
}
},
_observeContent: function (content) {
var self = this;
var h = Polymer.dom(content).observeNodes(function () {
self._scheduleNotify();
});
h._avoidChangeCalculation = true;
return h;
},
_unobserveContentElements: function (elements) {
for (var i = 0, n, h; i < elements.length && (n = elements[i]); i++) {
if (this._isContent(n)) {
h = n.__observeNodesMap.get(this);
if (h) {
Polymer.dom(n).unobserveNodes(h);
n.__observeNodesMap.delete(this);
}
}
}
},
_isContent: function (node) {
return node.localName === 'content';
},
_callListeners: function () {
var o$ = this._listeners;
var nodes = this._getEffectiveNodes();
for (var i = 0, o; i < o$.length && (o = o$[i]); i++) {
var info = this._generateListenerInfo(o, nodes);
if (info || o._alwaysNotify) {
this._callListener(o, info);
}
}
},
_getEffectiveNodes: function () {
return this.domApi.getEffectiveChildNodes();
},
_generateListenerInfo: function (listener, newNodes) {
if (listener._avoidChangeCalculation) {
return true;
}
var oldNodes = listener._nodes;
var info = {
target: this.node,
addedNodes: [],
removedNodes: []
};
var splices = Polymer.ArraySplice.calculateSplices(newNodes, oldNodes);
for (var i = 0, s; i < splices.length && (s = splices[i]); i++) {
for (var j = 0, n; j < s.removed.length && (n = s.removed[j]); j++) {
info.removedNodes.push(n);
}
}
for (i = 0, s; i < splices.length && (s = splices[i]); i++) {
for (j = s.index; j < s.index + s.addedCount; j++) {
info.addedNodes.push(newNodes[j]);
}
}
listener._nodes = newNodes;
if (info.addedNodes.length || info.removedNodes.length) {
return info;
}
},
_callListener: function (listener, info) {
return listener.fn.call(this.node, info);
},
enableShadowAttributeTracking: function () {
}
};
if (Settings.useShadow) {
var baseSetup = DomApi.EffectiveNodesObserver.prototype._setup;
var baseCleanup = DomApi.EffectiveNodesObserver.prototype._cleanup;
Polymer.Base.extend(DomApi.EffectiveNodesObserver.prototype, {
_setup: function () {
if (!this._observer) {
var self = this;
this._mutationHandler = function (mxns) {
if (mxns && mxns.length) {
self._scheduleNotify();
}
};
this._observer = new MutationObserver(this._mutationHandler);
this._boundFlush = function () {
self._flush();
};
Polymer.dom.addStaticFlush(this._boundFlush);
this._observer.observe(this.node, { childList: true });
}
baseSetup.call(this);
},
_cleanup: function () {
this._observer.disconnect();
this._observer = null;
this._mutationHandler = null;
Polymer.dom.removeStaticFlush(this._boundFlush);
baseCleanup.call(this);
},
_flush: function () {
if (this._observer) {
this._mutationHandler(this._observer.takeRecords());
}
},
enableShadowAttributeTracking: function () {
if (this._observer) {
this._makeContentListenersAlwaysNotify();
this._observer.disconnect();
this._observer.observe(this.node, {
childList: true,
attributes: true,
subtree: true
});
var root = this.domApi.getOwnerRoot();
var host = root && root.host;
if (host && Polymer.dom(host).observer) {
Polymer.dom(host).observer.enableShadowAttributeTracking();
}
}
},
_makeContentListenersAlwaysNotify: function () {
for (var i = 0, h; i < this._listeners.length; i++) {
h = this._listeners[i];
h._alwaysNotify = h._isContentListener;
}
}
});
}
}());
(function () {
'use strict';
var DomApi = Polymer.DomApi.ctor;
var Settings = Polymer.Settings;
DomApi.DistributedNodesObserver = function (domApi) {
DomApi.EffectiveNodesObserver.call(this, domApi);
};
DomApi.DistributedNodesObserver.prototype = Object.create(DomApi.EffectiveNodesObserver.prototype);
Polymer.Base.extend(DomApi.DistributedNodesObserver.prototype, {
_setup: function () {
},
_cleanup: function () {
},
_beforeCallListeners: function () {
},
_getEffectiveNodes: function () {
return this.domApi.getDistributedNodes();
}
});
if (Settings.useShadow) {
Polymer.Base.extend(DomApi.DistributedNodesObserver.prototype, {
_setup: function () {
if (!this._observer) {
var root = this.domApi.getOwnerRoot();
var host = root && root.host;
if (host) {
var self = this;
this._observer = Polymer.dom(host).observeNodes(function () {
self._scheduleNotify();
});
this._observer._isContentListener = true;
if (this._hasAttrSelect()) {
Polymer.dom(host).observer.enableShadowAttributeTracking();
}
}
}
},
_hasAttrSelect: function () {
var select = this.node.getAttribute('select');
return select && select.match(/[[.]+/);
},
_cleanup: function () {
var root = this.domApi.getOwnerRoot();
var host = root && root.host;
if (host) {
Polymer.dom(host).unobserveNodes(this._observer);
}
this._observer = null;
}
});
}
}());
(function () {
var DomApi = Polymer.DomApi;
var TreeApi = Polymer.TreeApi;
Polymer.Base._addFeature({
_prepShady: function () {
this._useContent = this._useContent || Boolean(this._template);
},
_setupShady: function () {
this.shadyRoot = null;
if (!this.__domApi) {
this.__domApi = null;
}
if (!this.__dom) {
this.__dom = null;
}
if (!this._ownerShadyRoot) {
this._ownerShadyRoot = undefined;
}
},
_poolContent: function () {
if (this._useContent) {
TreeApi.Logical.saveChildNodes(this);
}
},
_setupRoot: function () {
if (this._useContent) {
this._createLocalRoot();
if (!this.dataHost) {
upgradeLogicalChildren(TreeApi.Logical.getChildNodes(this));
}
}
},
_createLocalRoot: function () {
this.shadyRoot = this.root;
this.shadyRoot._distributionClean = false;
this.shadyRoot._hasDistributed = false;
this.shadyRoot._isShadyRoot = true;
this.shadyRoot._dirtyRoots = [];
var i$ = this.shadyRoot._insertionPoints = !this._notes || this._notes._hasContent ? this.shadyRoot.querySelectorAll('content') : [];
TreeApi.Logical.saveChildNodes(this.shadyRoot);
for (var i = 0, c; i < i$.length; i++) {
c = i$[i];
TreeApi.Logical.saveChildNodes(c);
TreeApi.Logical.saveChildNodes(c.parentNode);
}
this.shadyRoot.host = this;
},
get domHost() {
var root = Polymer.dom(this).getOwnerRoot();
return root && root.host;
},
distributeContent: function (updateInsertionPoints) {
if (this.shadyRoot) {
this.shadyRoot._invalidInsertionPoints = this.shadyRoot._invalidInsertionPoints || updateInsertionPoints;
var host = getTopDistributingHost(this);
Polymer.dom(this)._lazyDistribute(host);
}
},
_distributeContent: function () {
if (this._useContent && !this.shadyRoot._distributionClean) {
if (this.shadyRoot._invalidInsertionPoints) {
Polymer.dom(this)._updateInsertionPoints(this);
this.shadyRoot._invalidInsertionPoints = false;
}
this._beginDistribute();
this._distributeDirtyRoots();
this._finishDistribute();
}
},
_beginDistribute: function () {
if (this._useContent && DomApi.hasInsertionPoint(this.shadyRoot)) {
this._resetDistribution();
this._distributePool(this.shadyRoot, this._collectPool());
}
},
_distributeDirtyRoots: function () {
var c$ = this.shadyRoot._dirtyRoots;
for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
c._distributeContent();
}
this.shadyRoot._dirtyRoots = [];
},
_finishDistribute: function () {
if (this._useContent) {
this.shadyRoot._distributionClean = true;
if (DomApi.hasInsertionPoint(this.shadyRoot)) {
this._composeTree();
notifyContentObservers(this.shadyRoot);
} else {
if (!this.shadyRoot._hasDistributed) {
TreeApi.Composed.clearChildNodes(this);
this.appendChild(this.shadyRoot);
} else {
var children = this._composeNode(this);
this._updateChildNodes(this, children);
}
}
if (!this.shadyRoot._hasDistributed) {
notifyInitialDistribution(this);
}
this.shadyRoot._hasDistributed = true;
}
},
elementMatches: function (selector, node) {
node = node || this;
return DomApi.matchesSelector.call(node, selector);
},
_resetDistribution: function () {
var children = TreeApi.Logical.getChildNodes(this);
for (var i = 0; i < children.length; i++) {
var child = children[i];
if (child._destinationInsertionPoints) {
child._destinationInsertionPoints = undefined;
}
if (isInsertionPoint(child)) {
clearDistributedDestinationInsertionPoints(child);
}
}
var root = this.shadyRoot;
var p$ = root._insertionPoints;
for (var j = 0; j < p$.length; j++) {
p$[j]._distributedNodes = [];
}
},
_collectPool: function () {
var pool = [];
var children = TreeApi.Logical.getChildNodes(this);
for (var i = 0; i < children.length; i++) {
var child = children[i];
if (isInsertionPoint(child)) {
pool.push.apply(pool, child._distributedNodes);
} else {
pool.push(child);
}
}
return pool;
},
_distributePool: function (node, pool) {
var p$ = node._insertionPoints;
for (var i = 0, l = p$.length, p; i < l && (p = p$[i]); i++) {
this._distributeInsertionPoint(p, pool);
maybeRedistributeParent(p, this);
}
},
_distributeInsertionPoint: function (content, pool) {
var anyDistributed = false;
for (var i = 0, l = pool.length, node; i < l; i++) {
node = pool[i];
if (!node) {
continue;
}
if (this._matchesContentSelect(node, content)) {
distributeNodeInto(node, content);
pool[i] = undefined;
anyDistributed = true;
}
}
if (!anyDistributed) {
var children = TreeApi.Logical.getChildNodes(content);
for (var j = 0; j < children.length; j++) {
distributeNodeInto(children[j], content);
}
}
},
_composeTree: function () {
this._updateChildNodes(this, this._composeNode(this));
var p$ = this.shadyRoot._insertionPoints;
for (var i = 0, l = p$.length, p, parent; i < l && (p = p$[i]); i++) {
parent = TreeApi.Logical.getParentNode(p);
if (!parent._useContent && parent !== this && parent !== this.shadyRoot) {
this._updateChildNodes(parent, this._composeNode(parent));
}
}
},
_composeNode: function (node) {
var children = [];
var c$ = TreeApi.Logical.getChildNodes(node.shadyRoot || node);
for (var i = 0; i < c$.length; i++) {
var child = c$[i];
if (isInsertionPoint(child)) {
var distributedNodes = child._distributedNodes;
for (var j = 0; j < distributedNodes.length; j++) {
var distributedNode = distributedNodes[j];
if (isFinalDestination(child, distributedNode)) {
children.push(distributedNode);
}
}
} else {
children.push(child);
}
}
return children;
},
_updateChildNodes: function (container, children) {
var composed = TreeApi.Composed.getChildNodes(container);
var splices = Polymer.ArraySplice.calculateSplices(children, composed);
for (var i = 0, d = 0, s; i < splices.length && (s = splices[i]); i++) {
for (var j = 0, n; j < s.removed.length && (n = s.removed[j]); j++) {
if (TreeApi.Composed.getParentNode(n) === container) {
TreeApi.Composed.removeChild(container, n);
}
composed.splice(s.index + d, 1);
}
d -= s.addedCount;
}
for (var i = 0, s, next; i < splices.length && (s = splices[i]); i++) {
next = composed[s.index];
for (j = s.index, n; j < s.index + s.addedCount; j++) {
n = children[j];
TreeApi.Composed.insertBefore(container, n, next);
composed.splice(j, 0, n);
}
}
},
_matchesContentSelect: function (node, contentElement) {
var select = contentElement.getAttribute('select');
if (!select) {
return true;
}
select = select.trim();
if (!select) {
return true;
}
if (!(node instanceof Element)) {
return false;
}
var validSelectors = /^(:not\()?[*.#[a-zA-Z_|]/;
if (!validSelectors.test(select)) {
return false;
}
return this.elementMatches(select, node);
},
_elementAdd: function () {
},
_elementRemove: function () {
}
});
function distributeNodeInto(child, insertionPoint) {
insertionPoint._distributedNodes.push(child);
var points = child._destinationInsertionPoints;
if (!points) {
child._destinationInsertionPoints = [insertionPoint];
} else {
points.push(insertionPoint);
}
}
function clearDistributedDestinationInsertionPoints(content) {
var e$ = content._distributedNodes;
if (e$) {
for (var i = 0; i < e$.length; i++) {
var d = e$[i]._destinationInsertionPoints;
if (d) {
d.splice(d.indexOf(content) + 1, d.length);
}
}
}
}
function maybeRedistributeParent(content, host) {
var parent = TreeApi.Logical.getParentNode(content);
if (parent && parent.shadyRoot && DomApi.hasInsertionPoint(parent.shadyRoot) && parent.shadyRoot._distributionClean) {
parent.shadyRoot._distributionClean = false;
host.shadyRoot._dirtyRoots.push(parent);
}
}
function isFinalDestination(insertionPoint, node) {
var points = node._destinationInsertionPoints;
return points && points[points.length - 1] === insertionPoint;
}
function isInsertionPoint(node) {
return node.localName == 'content';
}
function getTopDistributingHost(host) {
while (host && hostNeedsRedistribution(host)) {
host = host.domHost;
}
return host;
}
function hostNeedsRedistribution(host) {
var c$ = TreeApi.Logical.getChildNodes(host);
for (var i = 0, c; i < c$.length; i++) {
c = c$[i];
if (c.localName && c.localName === 'content') {
return host.domHost;
}
}
}
function notifyContentObservers(root) {
for (var i = 0, c; i < root._insertionPoints.length; i++) {
c = root._insertionPoints[i];
if (DomApi.hasApi(c)) {
Polymer.dom(c).notifyObserver();
}
}
}
function notifyInitialDistribution(host) {
if (DomApi.hasApi(host)) {
Polymer.dom(host).notifyObserver();
}
}
var needsUpgrade = window.CustomElements && !CustomElements.useNative;
function upgradeLogicalChildren(children) {
if (needsUpgrade && children) {
for (var i = 0; i < children.length; i++) {
CustomElements.upgrade(children[i]);
}
}
}
}());
if (Polymer.Settings.useShadow) {
Polymer.Base._addFeature({
_poolContent: function () {
},
_beginDistribute: function () {
},
distributeContent: function () {
},
_distributeContent: function () {
},
_finishDistribute: function () {
},
_createLocalRoot: function () {
this.createShadowRoot();
this.shadowRoot.appendChild(this.root);
this.root = this.shadowRoot;
}
});
}
Polymer.Async = {
_currVal: 0,
_lastVal: 0,
_callbacks: [],
_twiddleContent: 0,
_twiddle: document.createTextNode(''),
run: function (callback, waitTime) {
if (waitTime > 0) {
return ~setTimeout(callback, waitTime);
} else {
this._twiddle.textContent = this._twiddleContent++;
this._callbacks.push(callback);
return this._currVal++;
}
},
cancel: function (handle) {
if (handle < 0) {
clearTimeout(~handle);
} else {
var idx = handle - this._lastVal;
if (idx >= 0) {
if (!this._callbacks[idx]) {
throw 'invalid async handle: ' + handle;
}
this._callbacks[idx] = null;
}
}
},
_atEndOfMicrotask: function () {
var len = this._callbacks.length;
for (var i = 0; i < len; i++) {
var cb = this._callbacks[i];
if (cb) {
try {
cb();
} catch (e) {
i++;
this._callbacks.splice(0, i);
this._lastVal += i;
this._twiddle.textContent = this._twiddleContent++;
throw e;
}
}
}
this._callbacks.splice(0, len);
this._lastVal += len;
}
};
new window.MutationObserver(function () {
Polymer.Async._atEndOfMicrotask();
}).observe(Polymer.Async._twiddle, { characterData: true });
Polymer.Debounce = function () {
var Async = Polymer.Async;
var Debouncer = function (context) {
this.context = context;
var self = this;
this.boundComplete = function () {
self.complete();
};
};
Debouncer.prototype = {
go: function (callback, wait) {
var h;
this.finish = function () {
Async.cancel(h);
};
h = Async.run(this.boundComplete, wait);
this.callback = callback;
},
stop: function () {
if (this.finish) {
this.finish();
this.finish = null;
}
},
complete: function () {
if (this.finish) {
this.stop();
this.callback.call(this.context);
}
}
};
function debounce(debouncer, callback, wait) {
if (debouncer) {
debouncer.stop();
} else {
debouncer = new Debouncer(this);
}
debouncer.go(callback, wait);
return debouncer;
}
return debounce;
}();
Polymer.Base._addFeature({
_setupDebouncers: function () {
this._debouncers = {};
},
debounce: function (jobName, callback, wait) {
return this._debouncers[jobName] = Polymer.Debounce.call(this, this._debouncers[jobName], callback, wait);
},
isDebouncerActive: function (jobName) {
var debouncer = this._debouncers[jobName];
return !!(debouncer && debouncer.finish);
},
flushDebouncer: function (jobName) {
var debouncer = this._debouncers[jobName];
if (debouncer) {
debouncer.complete();
}
},
cancelDebouncer: function (jobName) {
var debouncer = this._debouncers[jobName];
if (debouncer) {
debouncer.stop();
}
}
});
Polymer.DomModule = document.createElement('dom-module');
Polymer.Base._addFeature({
_registerFeatures: function () {
this._prepIs();
this._prepBehaviors();
this._prepConstructor();
this._prepTemplate();
this._prepShady();
this._prepPropertyInfo();
},
_prepBehavior: function (b) {
this._addHostAttributes(b.hostAttributes);
},
_initFeatures: function () {
this._registerHost();
if (this._template) {
this._poolContent();
this._beginHosting();
this._stampTemplate();
this._endHosting();
}
this._marshalHostAttributes();
this._setupDebouncers();
this._marshalBehaviors();
this._tryReady();
},
_marshalBehavior: function (b) {
}
});
Polymer.nar = [];
Polymer.Annotations = {
parseAnnotations: function (template) {
var list = [];
var content = template._content || template.content;
this._parseNodeAnnotations(content, list, template.hasAttribute('strip-whitespace'));
return list;
},
_parseNodeAnnotations: function (node, list, stripWhiteSpace) {
return node.nodeType === Node.TEXT_NODE ? this._parseTextNodeAnnotation(node, list) : this._parseElementAnnotations(node, list, stripWhiteSpace);
},
_bindingRegex: function () {
var IDENT = '(?:' + '[a-zA-Z_$][\\w.:$\\-*]*' + ')';
var NUMBER = '(?:' + '[-+]?[0-9]*\\.?[0-9]+(?:[eE][-+]?[0-9]+)?' + ')';
var SQUOTE_STRING = '(?:' + '\'(?:[^\'\\\\]|\\\\.)*\'' + ')';
var DQUOTE_STRING = '(?:' + '"(?:[^"\\\\]|\\\\.)*"' + ')';
var STRING = '(?:' + SQUOTE_STRING + '|' + DQUOTE_STRING + ')';
var ARGUMENT = '(?:' + IDENT + '|' + NUMBER + '|' + STRING + '\\s*' + ')';
var ARGUMENTS = '(?:' + ARGUMENT + '(?:,\\s*' + ARGUMENT + ')*' + ')';
var ARGUMENT_LIST = '(?:' + '\\(\\s*' + '(?:' + ARGUMENTS + '?' + ')' + '\\)\\s*' + ')';
var BINDING = '(' + IDENT + '\\s*' + ARGUMENT_LIST + '?' + ')';
var OPEN_BRACKET = '(\\[\\[|{{)' + '\\s*';
var CLOSE_BRACKET = '(?:]]|}})';
var NEGATE = '(?:(!)\\s*)?';
var EXPRESSION = OPEN_BRACKET + NEGATE + BINDING + CLOSE_BRACKET;
return new RegExp(EXPRESSION, 'g');
}(),
_parseBindings: function (text) {
var re = this._bindingRegex;
var parts = [];
var lastIndex = 0;
var m;
while ((m = re.exec(text)) !== null) {
if (m.index > lastIndex) {
parts.push({ literal: text.slice(lastIndex, m.index) });
}
var mode = m[1][0];
var negate = Boolean(m[2]);
var value = m[3].trim();
var customEvent, notifyEvent, colon;
if (mode == '{' && (colon = value.indexOf('::')) > 0) {
notifyEvent = value.substring(colon + 2);
value = value.substring(0, colon);
customEvent = true;
}
parts.push({
compoundIndex: parts.length,
value: value,
mode: mode,
negate: negate,
event: notifyEvent,
customEvent: customEvent
});
lastIndex = re.lastIndex;
}
if (lastIndex && lastIndex < text.length) {
var literal = text.substring(lastIndex);
if (literal) {
parts.push({ literal: literal });
}
}
if (parts.length) {
return parts;
}
},
_literalFromParts: function (parts) {
var s = '';
for (var i = 0; i < parts.length; i++) {
var literal = parts[i].literal;
s += literal || '';
}
return s;
},
_parseTextNodeAnnotation: function (node, list) {
var parts = this._parseBindings(node.textContent);
if (parts) {
node.textContent = this._literalFromParts(parts) || ' ';
var annote = {
bindings: [{
kind: 'text',
name: 'textContent',
parts: parts,
isCompound: parts.length !== 1
}]
};
list.push(annote);
return annote;
}
},
_parseElementAnnotations: function (element, list, stripWhiteSpace) {
var annote = {
bindings: [],
events: []
};
if (element.localName === 'content') {
list._hasContent = true;
}
this._parseChildNodesAnnotations(element, annote, list, stripWhiteSpace);
if (element.attributes) {
this._parseNodeAttributeAnnotations(element, annote, list);
if (this.prepElement) {
this.prepElement(element);
}
}
if (annote.bindings.length || annote.events.length || annote.id) {
list.push(annote);
}
return annote;
},
_parseChildNodesAnnotations: function (root, annote, list, stripWhiteSpace) {
if (root.firstChild) {
var node = root.firstChild;
var i = 0;
while (node) {
var next = node.nextSibling;
if (node.localName === 'template' && !node.hasAttribute('preserve-content')) {
this._parseTemplate(node, i, list, annote);
}
if (node.nodeType === Node.TEXT_NODE) {
var n = next;
while (n && n.nodeType === Node.TEXT_NODE) {
node.textContent += n.textContent;
next = n.nextSibling;
root.removeChild(n);
n = next;
}
if (stripWhiteSpace && !node.textContent.trim()) {
root.removeChild(node);
i--;
}
}
if (node.parentNode) {
var childAnnotation = this._parseNodeAnnotations(node, list, stripWhiteSpace);
if (childAnnotation) {
childAnnotation.parent = annote;
childAnnotation.index = i;
}
}
node = next;
i++;
}
}
},
_parseTemplate: function (node, index, list, parent) {
var content = document.createDocumentFragment();
content._notes = this.parseAnnotations(node);
content.appendChild(node.content);
list.push({
bindings: Polymer.nar,
events: Polymer.nar,
templateContent: content,
parent: parent,
index: index
});
},
_parseNodeAttributeAnnotations: function (node, annotation) {
var attrs = Array.prototype.slice.call(node.attributes);
for (var i = attrs.length - 1, a; a = attrs[i]; i--) {
var n = a.name;
var v = a.value;
var b;
if (n.slice(0, 3) === 'on-') {
node.removeAttribute(n);
annotation.events.push({
name: n.slice(3),
value: v
});
} else if (b = this._parseNodeAttributeAnnotation(node, n, v)) {
annotation.bindings.push(b);
} else if (n === 'id') {
annotation.id = v;
}
}
},
_parseNodeAttributeAnnotation: function (node, name, value) {
var parts = this._parseBindings(value);
if (parts) {
var origName = name;
var kind = 'property';
if (name[name.length - 1] == '$') {
name = name.slice(0, -1);
kind = 'attribute';
}
var literal = this._literalFromParts(parts);
if (literal && kind == 'attribute') {
node.setAttribute(name, literal);
}
if (node.localName === 'input' && origName === 'value') {
node.setAttribute(origName, '');
}
node.removeAttribute(origName);
var propertyName = Polymer.CaseMap.dashToCamelCase(name);
if (kind === 'property') {
name = propertyName;
}
return {
kind: kind,
name: name,
propertyName: propertyName,
parts: parts,
literal: literal,
isCompound: parts.length !== 1
};
}
},
findAnnotatedNode: function (root, annote) {
var parent = annote.parent && Polymer.Annotations.findAnnotatedNode(root, annote.parent);
if (parent) {
for (var n = parent.firstChild, i = 0; n; n = n.nextSibling) {
if (annote.index === i++) {
return n;
}
}
} else {
return root;
}
}
};
(function () {
function resolveCss(cssText, ownerDocument) {
return cssText.replace(CSS_URL_RX, function (m, pre, url, post) {
return pre + '\'' + resolve(url.replace(/["']/g, ''), ownerDocument) + '\'' + post;
});
}
function resolveAttrs(element, ownerDocument) {
for (var name in URL_ATTRS) {
var a$ = URL_ATTRS[name];
for (var i = 0, l = a$.length, a, at, v; i < l && (a = a$[i]); i++) {
if (name === '*' || element.localName === name) {
at = element.attributes[a];
v = at && at.value;
if (v && v.search(BINDING_RX) < 0) {
at.value = a === 'style' ? resolveCss(v, ownerDocument) : resolve(v, ownerDocument);
}
}
}
}
}
function resolve(url, ownerDocument) {
if (url && url[0] === '#') {
return url;
}
var resolver = getUrlResolver(ownerDocument);
resolver.href = url;
return resolver.href || url;
}
var tempDoc;
var tempDocBase;
function resolveUrl(url, baseUri) {
if (!tempDoc) {
tempDoc = document.implementation.createHTMLDocument('temp');
tempDocBase = tempDoc.createElement('base');
tempDoc.head.appendChild(tempDocBase);
}
tempDocBase.href = baseUri;
return resolve(url, tempDoc);
}
function getUrlResolver(ownerDocument) {
return ownerDocument.__urlResolver || (ownerDocument.__urlResolver = ownerDocument.createElement('a'));
}
var CSS_URL_RX = /(url\()([^)]*)(\))/g;
var URL_ATTRS = {
'*': [
'href',
'src',
'style',
'url'
],
form: ['action']
};
var BINDING_RX = /\{\{|\[\[/;
Polymer.ResolveUrl = {
resolveCss: resolveCss,
resolveAttrs: resolveAttrs,
resolveUrl: resolveUrl
};
}());
Polymer.Base._addFeature({
_prepAnnotations: function () {
if (!this._template) {
this._notes = [];
} else {
var self = this;
Polymer.Annotations.prepElement = function (element) {
self._prepElement(element);
};
if (this._template._content && this._template._content._notes) {
this._notes = this._template._content._notes;
} else {
this._notes = Polymer.Annotations.parseAnnotations(this._template);
this._processAnnotations(this._notes);
}
Polymer.Annotations.prepElement = null;
}
},
_processAnnotations: function (notes) {
for (var i = 0; i < notes.length; i++) {
var note = notes[i];
for (var j = 0; j < note.bindings.length; j++) {
var b = note.bindings[j];
for (var k = 0; k < b.parts.length; k++) {
var p = b.parts[k];
if (!p.literal) {
var signature = this._parseMethod(p.value);
if (signature) {
p.signature = signature;
} else {
p.model = this._modelForPath(p.value);
}
}
}
}
if (note.templateContent) {
this._processAnnotations(note.templateContent._notes);
var pp = note.templateContent._parentProps = this._discoverTemplateParentProps(note.templateContent._notes);
var bindings = [];
for (var prop in pp) {
bindings.push({
index: note.index,
kind: 'property',
name: '_parent_' + prop,
parts: [{
mode: '{',
model: prop,
value: prop
}]
});
}
note.bindings = note.bindings.concat(bindings);
}
}
},
_discoverTemplateParentProps: function (notes) {
var pp = {};
for (var i = 0, n; i < notes.length && (n = notes[i]); i++) {
for (var j = 0, b$ = n.bindings, b; j < b$.length && (b = b$[j]); j++) {
for (var k = 0, p$ = b.parts, p; k < p$.length && (p = p$[k]); k++) {
if (p.signature) {
var args = p.signature.args;
for (var kk = 0; kk < args.length; kk++) {
var model = args[kk].model;
if (model) {
pp[model] = true;
}
}
} else {
if (p.model) {
pp[p.model] = true;
}
}
}
}
if (n.templateContent) {
var tpp = n.templateContent._parentProps;
Polymer.Base.mixin(pp, tpp);
}
}
return pp;
},
_prepElement: function (element) {
Polymer.ResolveUrl.resolveAttrs(element, this._template.ownerDocument);
},
_findAnnotatedNode: Polymer.Annotations.findAnnotatedNode,
_marshalAnnotationReferences: function () {
if (this._template) {
this._marshalIdNodes();
this._marshalAnnotatedNodes();
this._marshalAnnotatedListeners();
}
},
_configureAnnotationReferences: function () {
var notes = this._notes;
var nodes = this._nodes;
for (var i = 0; i < notes.length; i++) {
var note = notes[i];
var node = nodes[i];
this._configureTemplateContent(note, node);
this._configureCompoundBindings(note, node);
}
},
_configureTemplateContent: function (note, node) {
if (note.templateContent) {
node._content = note.templateContent;
}
},
_configureCompoundBindings: function (note, node) {
var bindings = note.bindings;
for (var i = 0; i < bindings.length; i++) {
var binding = bindings[i];
if (binding.isCompound) {
var storage = node.__compoundStorage__ || (node.__compoundStorage__ = {});
var parts = binding.parts;
var literals = new Array(parts.length);
for (var j = 0; j < parts.length; j++) {
literals[j] = parts[j].literal;
}
var name = binding.name;
storage[name] = literals;
if (binding.literal && binding.kind == 'property') {
if (node._configValue) {
node._configValue(name, binding.literal);
} else {
node[name] = binding.literal;
}
}
}
}
},
_marshalIdNodes: function () {
this.$ = {};
for (var i = 0, l = this._notes.length, a; i < l && (a = this._notes[i]); i++) {
if (a.id) {
this.$[a.id] = this._findAnnotatedNode(this.root, a);
}
}
},
_marshalAnnotatedNodes: function () {
if (this._notes && this._notes.length) {
var r = new Array(this._notes.length);
for (var i = 0; i < this._notes.length; i++) {
r[i] = this._findAnnotatedNode(this.root, this._notes[i]);
}
this._nodes = r;
}
},
_marshalAnnotatedListeners: function () {
for (var i = 0, l = this._notes.length, a; i < l && (a = this._notes[i]); i++) {
if (a.events && a.events.length) {
var node = this._findAnnotatedNode(this.root, a);
for (var j = 0, e$ = a.events, e; j < e$.length && (e = e$[j]); j++) {
this.listen(node, e.name, e.value);
}
}
}
}
});
Polymer.Base._addFeature({
listeners: {},
_listenListeners: function (listeners) {
var node, name, eventName;
for (eventName in listeners) {
if (eventName.indexOf('.') < 0) {
node = this;
name = eventName;
} else {
name = eventName.split('.');
node = this.$[name[0]];
name = name[1];
}
this.listen(node, name, listeners[eventName]);
}
},
listen: function (node, eventName, methodName) {
var handler = this._recallEventHandler(this, eventName, node, methodName);
if (!handler) {
handler = this._createEventHandler(node, eventName, methodName);
}
if (handler._listening) {
return;
}
this._listen(node, eventName, handler);
handler._listening = true;
},
_boundListenerKey: function (eventName, methodName) {
return eventName + ':' + methodName;
},
_recordEventHandler: function (host, eventName, target, methodName, handler) {
var hbl = host.__boundListeners;
if (!hbl) {
hbl = host.__boundListeners = new WeakMap();
}
var bl = hbl.get(target);
if (!bl) {
bl = {};
hbl.set(target, bl);
}
var key = this._boundListenerKey(eventName, methodName);
bl[key] = handler;
},
_recallEventHandler: function (host, eventName, target, methodName) {
var hbl = host.__boundListeners;
if (!hbl) {
return;
}
var bl = hbl.get(target);
if (!bl) {
return;
}
var key = this._boundListenerKey(eventName, methodName);
return bl[key];
},
_createEventHandler: function (node, eventName, methodName) {
var host = this;
var handler = function (e) {
if (host[methodName]) {
host[methodName](e, e.detail);
} else {
host._warn(host._logf('_createEventHandler', 'listener method `' + methodName + '` not defined'));
}
};
handler._listening = false;
this._recordEventHandler(host, eventName, node, methodName, handler);
return handler;
},
unlisten: function (node, eventName, methodName) {
var handler = this._recallEventHandler(this, eventName, node, methodName);
if (handler) {
this._unlisten(node, eventName, handler);
handler._listening = false;
}
},
_listen: function (node, eventName, handler) {
node.addEventListener(eventName, handler);
},
_unlisten: function (node, eventName, handler) {
node.removeEventListener(eventName, handler);
}
});
(function () {
'use strict';
var wrap = Polymer.DomApi.wrap;
var HAS_NATIVE_TA = typeof document.head.style.touchAction === 'string';
var GESTURE_KEY = '__polymerGestures';
var HANDLED_OBJ = '__polymerGesturesHandled';
var TOUCH_ACTION = '__polymerGesturesTouchAction';
var TAP_DISTANCE = 25;
var TRACK_DISTANCE = 5;
var TRACK_LENGTH = 2;
var MOUSE_TIMEOUT = 2500;
var MOUSE_EVENTS = [
'mousedown',
'mousemove',
'mouseup',
'click'
];
var MOUSE_WHICH_TO_BUTTONS = [
0,
1,
4,
2
];
var MOUSE_HAS_BUTTONS = function () {
try {
return new MouseEvent('test', { buttons: 1 }).buttons === 1;
} catch (e) {
return false;
}
}();
var IS_TOUCH_ONLY = navigator.userAgent.match(/iP(?:[oa]d|hone)|Android/);
var mouseCanceller = function (mouseEvent) {
mouseEvent[HANDLED_OBJ] = { skip: true };
if (mouseEvent.type === 'click') {
var path = Polymer.dom(mouseEvent).path;
for (var i = 0; i < path.length; i++) {
if (path[i] === POINTERSTATE.mouse.target) {
return;
}
}
mouseEvent.preventDefault();
mouseEvent.stopPropagation();
}
};
function setupTeardownMouseCanceller(setup) {
for (var i = 0, en; i < MOUSE_EVENTS.length; i++) {
en = MOUSE_EVENTS[i];
if (setup) {
document.addEventListener(en, mouseCanceller, true);
} else {
document.removeEventListener(en, mouseCanceller, true);
}
}
}
function ignoreMouse() {
if (IS_TOUCH_ONLY) {
return;
}
if (!POINTERSTATE.mouse.mouseIgnoreJob) {
setupTeardownMouseCanceller(true);
}
var unset = function () {
setupTeardownMouseCanceller();
POINTERSTATE.mouse.target = null;
POINTERSTATE.mouse.mouseIgnoreJob = null;
};
POINTERSTATE.mouse.mouseIgnoreJob = Polymer.Debounce(POINTERSTATE.mouse.mouseIgnoreJob, unset, MOUSE_TIMEOUT);
}
function hasLeftMouseButton(ev) {
var type = ev.type;
if (MOUSE_EVENTS.indexOf(type) === -1) {
return false;
}
if (type === 'mousemove') {
var buttons = ev.buttons === undefined ? 1 : ev.buttons;
if (ev instanceof window.MouseEvent && !MOUSE_HAS_BUTTONS) {
buttons = MOUSE_WHICH_TO_BUTTONS[ev.which] || 0;
}
return Boolean(buttons & 1);
} else {
var button = ev.button === undefined ? 0 : ev.button;
return button === 0;
}
}
function isSyntheticClick(ev) {
if (ev.type === 'click') {
if (ev.detail === 0) {
return true;
}
var t = Gestures.findOriginalTarget(ev);
var bcr = t.getBoundingClientRect();
var x = ev.pageX, y = ev.pageY;
return !(x >= bcr.left && x <= bcr.right && (y >= bcr.top && y <= bcr.bottom));
}
return false;
}
var POINTERSTATE = {
mouse: {
target: null,
mouseIgnoreJob: null
},
touch: {
x: 0,
y: 0,
id: -1,
scrollDecided: false
}
};
function firstTouchAction(ev) {
var path = Polymer.dom(ev).path;
var ta = 'auto';
for (var i = 0, n; i < path.length; i++) {
n = path[i];
if (n[TOUCH_ACTION]) {
ta = n[TOUCH_ACTION];
break;
}
}
return ta;
}
function trackDocument(stateObj, movefn, upfn) {
stateObj.movefn = movefn;
stateObj.upfn = upfn;
document.addEventListener('mousemove', movefn);
document.addEventListener('mouseup', upfn);
}
function untrackDocument(stateObj) {
document.removeEventListener('mousemove', stateObj.movefn);
document.removeEventListener('mouseup', stateObj.upfn);
stateObj.movefn = null;
stateObj.upfn = null;
}
var Gestures = {
gestures: {},
recognizers: [],
deepTargetFind: function (x, y) {
var node = document.elementFromPoint(x, y);
var next = node;
while (next && next.shadowRoot) {
next = next.shadowRoot.elementFromPoint(x, y);
if (next) {
node = next;
}
}
return node;
},
findOriginalTarget: function (ev) {
if (ev.path) {
return ev.path[0];
}
return ev.target;
},
handleNative: function (ev) {
var handled;
var type = ev.type;
var node = wrap(ev.currentTarget);
var gobj = node[GESTURE_KEY];
if (!gobj) {
return;
}
var gs = gobj[type];
if (!gs) {
return;
}
if (!ev[HANDLED_OBJ]) {
ev[HANDLED_OBJ] = {};
if (type.slice(0, 5) === 'touch') {
var t = ev.changedTouches[0];
if (type === 'touchstart') {
if (ev.touches.length === 1) {
POINTERSTATE.touch.id = t.identifier;
}
}
if (POINTERSTATE.touch.id !== t.identifier) {
return;
}
if (!HAS_NATIVE_TA) {
if (type === 'touchstart' || type === 'touchmove') {
Gestures.handleTouchAction(ev);
}
}
if (type === 'touchend' && !ev.__polymerSimulatedTouch) {
POINTERSTATE.mouse.target = Polymer.dom(ev).rootTarget;
ignoreMouse(true);
}
}
}
handled = ev[HANDLED_OBJ];
if (handled.skip) {
return;
}
var recognizers = Gestures.recognizers;
for (var i = 0, r; i < recognizers.length; i++) {
r = recognizers[i];
if (gs[r.name] && !handled[r.name]) {
if (r.flow && r.flow.start.indexOf(ev.type) > -1 && r.reset) {
r.reset();
}
}
}
for (i = 0, r; i < recognizers.length; i++) {
r = recognizers[i];
if (gs[r.name] && !handled[r.name]) {
handled[r.name] = true;
r[type](ev);
}
}
},
handleTouchAction: function (ev) {
var t = ev.changedTouches[0];
var type = ev.type;
if (type === 'touchstart') {
POINTERSTATE.touch.x = t.clientX;
POINTERSTATE.touch.y = t.clientY;
POINTERSTATE.touch.scrollDecided = false;
} else if (type === 'touchmove') {
if (POINTERSTATE.touch.scrollDecided) {
return;
}
POINTERSTATE.touch.scrollDecided = true;
var ta = firstTouchAction(ev);
var prevent = false;
var dx = Math.abs(POINTERSTATE.touch.x - t.clientX);
var dy = Math.abs(POINTERSTATE.touch.y - t.clientY);
if (!ev.cancelable) {
} else if (ta === 'none') {
prevent = true;
} else if (ta === 'pan-x') {
prevent = dy > dx;
} else if (ta === 'pan-y') {
prevent = dx > dy;
}
if (prevent) {
ev.preventDefault();
} else {
Gestures.prevent('track');
}
}
},
add: function (node, evType, handler) {
node = wrap(node);
var recognizer = this.gestures[evType];
var deps = recognizer.deps;
var name = recognizer.name;
var gobj = node[GESTURE_KEY];
if (!gobj) {
node[GESTURE_KEY] = gobj = {};
}
for (var i = 0, dep, gd; i < deps.length; i++) {
dep = deps[i];
if (IS_TOUCH_ONLY && MOUSE_EVENTS.indexOf(dep) > -1) {
continue;
}
gd = gobj[dep];
if (!gd) {
gobj[dep] = gd = { _count: 0 };
}
if (gd._count === 0) {
node.addEventListener(dep, this.handleNative);
}
gd[name] = (gd[name] || 0) + 1;
gd._count = (gd._count || 0) + 1;
}
node.addEventListener(evType, handler);
if (recognizer.touchAction) {
this.setTouchAction(node, recognizer.touchAction);
}
},
remove: function (node, evType, handler) {
node = wrap(node);
var recognizer = this.gestures[evType];
var deps = recognizer.deps;
var name = recognizer.name;
var gobj = node[GESTURE_KEY];
if (gobj) {
for (var i = 0, dep, gd; i < deps.length; i++) {
dep = deps[i];
gd = gobj[dep];
if (gd && gd[name]) {
gd[name] = (gd[name] || 1) - 1;
gd._count = (gd._count || 1) - 1;
if (gd._count === 0) {
node.removeEventListener(dep, this.handleNative);
}
}
}
}
node.removeEventListener(evType, handler);
},
register: function (recog) {
this.recognizers.push(recog);
for (var i = 0; i < recog.emits.length; i++) {
this.gestures[recog.emits[i]] = recog;
}
},
findRecognizerByEvent: function (evName) {
for (var i = 0, r; i < this.recognizers.length; i++) {
r = this.recognizers[i];
for (var j = 0, n; j < r.emits.length; j++) {
n = r.emits[j];
if (n === evName) {
return r;
}
}
}
return null;
},
setTouchAction: function (node, value) {
if (HAS_NATIVE_TA) {
node.style.touchAction = value;
}
node[TOUCH_ACTION] = value;
},
fire: function (target, type, detail) {
var ev = Polymer.Base.fire(type, detail, {
node: target,
bubbles: true,
cancelable: true
});
if (ev.defaultPrevented) {
var se = detail.sourceEvent;
if (se && se.preventDefault) {
se.preventDefault();
}
}
},
prevent: function (evName) {
var recognizer = this.findRecognizerByEvent(evName);
if (recognizer.info) {
recognizer.info.prevent = true;
}
}
};
Gestures.register({
name: 'downup',
deps: [
'mousedown',
'touchstart',
'touchend'
],
flow: {
start: [
'mousedown',
'touchstart'
],
end: [
'mouseup',
'touchend'
]
},
emits: [
'down',
'up'
],
info: {
movefn: null,
upfn: null
},
reset: function () {
untrackDocument(this.info);
},
mousedown: function (e) {
if (!hasLeftMouseButton(e)) {
return;
}
var t = Gestures.findOriginalTarget(e);
var self = this;
var movefn = function movefn(e) {
if (!hasLeftMouseButton(e)) {
self.fire('up', t, e);
untrackDocument(self.info);
}
};
var upfn = function upfn(e) {
if (hasLeftMouseButton(e)) {
self.fire('up', t, e);
}
untrackDocument(self.info);
};
trackDocument(this.info, movefn, upfn);
this.fire('down', t, e);
},
touchstart: function (e) {
this.fire('down', Gestures.findOriginalTarget(e), e.changedTouches[0]);
},
touchend: function (e) {
this.fire('up', Gestures.findOriginalTarget(e), e.changedTouches[0]);
},
fire: function (type, target, event) {
Gestures.fire(target, type, {
x: event.clientX,
y: event.clientY,
sourceEvent: event,
prevent: function (e) {
return Gestures.prevent(e);
}
});
}
});
Gestures.register({
name: 'track',
touchAction: 'none',
deps: [
'mousedown',
'touchstart',
'touchmove',
'touchend'
],
flow: {
start: [
'mousedown',
'touchstart'
],
end: [
'mouseup',
'touchend'
]
},
emits: ['track'],
info: {
x: 0,
y: 0,
state: 'start',
started: false,
moves: [],
addMove: function (move) {
if (this.moves.length > TRACK_LENGTH) {
this.moves.shift();
}
this.moves.push(move);
},
movefn: null,
upfn: null,
prevent: false
},
reset: function () {
this.info.state = 'start';
this.info.started = false;
this.info.moves = [];
this.info.x = 0;
this.info.y = 0;
this.info.prevent = false;
untrackDocument(this.info);
},
hasMovedEnough: function (x, y) {
if (this.info.prevent) {
return false;
}
if (this.info.started) {
return true;
}
var dx = Math.abs(this.info.x - x);
var dy = Math.abs(this.info.y - y);
return dx >= TRACK_DISTANCE || dy >= TRACK_DISTANCE;
},
mousedown: function (e) {
if (!hasLeftMouseButton(e)) {
return;
}
var t = Gestures.findOriginalTarget(e);
var self = this;
var movefn = function movefn(e) {
var x = e.clientX, y = e.clientY;
if (self.hasMovedEnough(x, y)) {
self.info.state = self.info.started ? e.type === 'mouseup' ? 'end' : 'track' : 'start';
if (self.info.state === 'start') {
Gestures.prevent('tap');
}
self.info.addMove({
x: x,
y: y
});
if (!hasLeftMouseButton(e)) {
self.info.state = 'end';
untrackDocument(self.info);
}
self.fire(t, e);
self.info.started = true;
}
};
var upfn = function upfn(e) {
if (self.info.started) {
movefn(e);
}
untrackDocument(self.info);
};
trackDocument(this.info, movefn, upfn);
this.info.x = e.clientX;
this.info.y = e.clientY;
},
touchstart: function (e) {
var ct = e.changedTouches[0];
this.info.x = ct.clientX;
this.info.y = ct.clientY;
},
touchmove: function (e) {
var t = Gestures.findOriginalTarget(e);
var ct = e.changedTouches[0];
var x = ct.clientX, y = ct.clientY;
if (this.hasMovedEnough(x, y)) {
if (this.info.state === 'start') {
Gestures.prevent('tap');
}
this.info.addMove({
x: x,
y: y
});
this.fire(t, ct);
this.info.state = 'track';
this.info.started = true;
}
},
touchend: function (e) {
var t = Gestures.findOriginalTarget(e);
var ct = e.changedTouches[0];
if (this.info.started) {
this.info.state = 'end';
this.info.addMove({
x: ct.clientX,
y: ct.clientY
});
this.fire(t, ct);
}
},
fire: function (target, touch) {
var secondlast = this.info.moves[this.info.moves.length - 2];
var lastmove = this.info.moves[this.info.moves.length - 1];
var dx = lastmove.x - this.info.x;
var dy = lastmove.y - this.info.y;
var ddx, ddy = 0;
if (secondlast) {
ddx = lastmove.x - secondlast.x;
ddy = lastmove.y - secondlast.y;
}
return Gestures.fire(target, 'track', {
state: this.info.state,
x: touch.clientX,
y: touch.clientY,
dx: dx,
dy: dy,
ddx: ddx,
ddy: ddy,
sourceEvent: touch,
hover: function () {
return Gestures.deepTargetFind(touch.clientX, touch.clientY);
}
});
}
});
Gestures.register({
name: 'tap',
deps: [
'mousedown',
'click',
'touchstart',
'touchend'
],
flow: {
start: [
'mousedown',
'touchstart'
],
end: [
'click',
'touchend'
]
},
emits: ['tap'],
info: {
x: NaN,
y: NaN,
prevent: false
},
reset: function () {
this.info.x = NaN;
this.info.y = NaN;
this.info.prevent = false;
},
save: function (e) {
this.info.x = e.clientX;
this.info.y = e.clientY;
},
mousedown: function (e) {
if (hasLeftMouseButton(e)) {
this.save(e);
}
},
click: function (e) {
if (hasLeftMouseButton(e)) {
this.forward(e);
}
},
touchstart: function (e) {
this.save(e.changedTouches[0]);
},
touchend: function (e) {
this.forward(e.changedTouches[0]);
},
forward: function (e) {
var dx = Math.abs(e.clientX - this.info.x);
var dy = Math.abs(e.clientY - this.info.y);
var t = Gestures.findOriginalTarget(e);
if (isNaN(dx) || isNaN(dy) || dx <= TAP_DISTANCE && dy <= TAP_DISTANCE || isSyntheticClick(e)) {
if (!this.info.prevent) {
Gestures.fire(t, 'tap', {
x: e.clientX,
y: e.clientY,
sourceEvent: e
});
}
}
}
});
var DIRECTION_MAP = {
x: 'pan-x',
y: 'pan-y',
none: 'none',
all: 'auto'
};
Polymer.Base._addFeature({
_setupGestures: function () {
this.__polymerGestures = null;
},
_listen: function (node, eventName, handler) {
if (Gestures.gestures[eventName]) {
Gestures.add(node, eventName, handler);
} else {
node.addEventListener(eventName, handler);
}
},
_unlisten: function (node, eventName, handler) {
if (Gestures.gestures[eventName]) {
Gestures.remove(node, eventName, handler);
} else {
node.removeEventListener(eventName, handler);
}
},
setScrollDirection: function (direction, node) {
node = node || this;
Gestures.setTouchAction(node, DIRECTION_MAP[direction] || 'auto');
}
});
Polymer.Gestures = Gestures;
}());
Polymer.Base._addFeature({
$$: function (slctr) {
return Polymer.dom(this.root).querySelector(slctr);
},
toggleClass: function (name, bool, node) {
node = node || this;
if (arguments.length == 1) {
bool = !node.classList.contains(name);
}
if (bool) {
Polymer.dom(node).classList.add(name);
} else {
Polymer.dom(node).classList.remove(name);
}
},
toggleAttribute: function (name, bool, node) {
node = node || this;
if (arguments.length == 1) {
bool = !node.hasAttribute(name);
}
if (bool) {
Polymer.dom(node).setAttribute(name, '');
} else {
Polymer.dom(node).removeAttribute(name);
}
},
classFollows: function (name, toElement, fromElement) {
if (fromElement) {
Polymer.dom(fromElement).classList.remove(name);
}
if (toElement) {
Polymer.dom(toElement).classList.add(name);
}
},
attributeFollows: function (name, toElement, fromElement) {
if (fromElement) {
Polymer.dom(fromElement).removeAttribute(name);
}
if (toElement) {
Polymer.dom(toElement).setAttribute(name, '');
}
},
getEffectiveChildNodes: function () {
return Polymer.dom(this).getEffectiveChildNodes();
},
getEffectiveChildren: function () {
var list = Polymer.dom(this).getEffectiveChildNodes();
return list.filter(function (n) {
return n.nodeType === Node.ELEMENT_NODE;
});
},
getEffectiveTextContent: function () {
var cn = this.getEffectiveChildNodes();
var tc = [];
for (var i = 0, c; c = cn[i]; i++) {
if (c.nodeType !== Node.COMMENT_NODE) {
tc.push(Polymer.dom(c).textContent);
}
}
return tc.join('');
},
queryEffectiveChildren: function (slctr) {
var e$ = Polymer.dom(this).queryDistributedElements(slctr);
return e$ && e$[0];
},
queryAllEffectiveChildren: function (slctr) {
return Polymer.dom(this).queryDistributedElements(slctr);
},
getContentChildNodes: function (slctr) {
var content = Polymer.dom(this.root).querySelector(slctr || 'content');
return content ? Polymer.dom(content).getDistributedNodes() : [];
},
getContentChildren: function (slctr) {
return this.getContentChildNodes(slctr).filter(function (n) {
return n.nodeType === Node.ELEMENT_NODE;
});
},
fire: function (type, detail, options) {
options = options || Polymer.nob;
var node = options.node || this;
detail = detail === null || detail === undefined ? {} : detail;
var bubbles = options.bubbles === undefined ? true : options.bubbles;
var cancelable = Boolean(options.cancelable);
var useCache = options._useCache;
var event = this._getEvent(type, bubbles, cancelable, useCache);
event.detail = detail;
if (useCache) {
this.__eventCache[type] = null;
}
node.dispatchEvent(event);
if (useCache) {
this.__eventCache[type] = event;
}
return event;
},
__eventCache: {},
_getEvent: function (type, bubbles, cancelable, useCache) {
var event = useCache && this.__eventCache[type];
if (!event || (event.bubbles != bubbles || event.cancelable != cancelable)) {
event = new Event(type, {
bubbles: Boolean(bubbles),
cancelable: cancelable
});
}
return event;
},
async: function (callback, waitTime) {
var self = this;
return Polymer.Async.run(function () {
callback.call(self);
}, waitTime);
},
cancelAsync: function (handle) {
Polymer.Async.cancel(handle);
},
arrayDelete: function (path, item) {
var index;
if (Array.isArray(path)) {
index = path.indexOf(item);
if (index >= 0) {
return path.splice(index, 1);
}
} else {
var arr = this._get(path);
index = arr.indexOf(item);
if (index >= 0) {
return this.splice(path, index, 1);
}
}
},
transform: function (transform, node) {
node = node || this;
node.style.webkitTransform = transform;
node.style.transform = transform;
},
translate3d: function (x, y, z, node) {
node = node || this;
this.transform('translate3d(' + x + ',' + y + ',' + z + ')', node);
},
importHref: function (href, onload, onerror, optAsync) {
var l = document.createElement('link');
l.rel = 'import';
l.href = href;
optAsync = Boolean(optAsync);
if (optAsync) {
l.setAttribute('async', '');
}
var self = this;
if (onload) {
l.onload = function (e) {
return onload.call(self, e);
};
}
if (onerror) {
l.onerror = function (e) {
return onerror.call(self, e);
};
}
document.head.appendChild(l);
return l;
},
create: function (tag, props) {
var elt = document.createElement(tag);
if (props) {
for (var n in props) {
elt[n] = props[n];
}
}
return elt;
},
isLightDescendant: function (node) {
return this !== node && this.contains(node) && Polymer.dom(this).getOwnerRoot() === Polymer.dom(node).getOwnerRoot();
},
isLocalDescendant: function (node) {
return this.root === Polymer.dom(node).getOwnerRoot();
}
});
Polymer.Bind = {
_dataEventCache: {},
prepareModel: function (model) {
Polymer.Base.mixin(model, this._modelApi);
},
_modelApi: {
_notifyChange: function (source, event, value) {
value = value === undefined ? this[source] : value;
event = event || Polymer.CaseMap.camelToDashCase(source) + '-changed';
this.fire(event, { value: value }, {
bubbles: false,
cancelable: false,
_useCache: true
});
},
_propertySetter: function (property, value, effects, fromAbove) {
var old = this.__data__[property];
if (old !== value && (old === old || value === value)) {
this.__data__[property] = value;
if (typeof value == 'object') {
this._clearPath(property);
}
if (this._propertyChanged) {
this._propertyChanged(property, value, old);
}
if (effects) {
this._effectEffects(property, value, effects, old, fromAbove);
}
}
return old;
},
__setProperty: function (property, value, quiet, node) {
node = node || this;
var effects = node._propertyEffects && node._propertyEffects[property];
if (effects) {
node._propertySetter(property, value, effects, quiet);
} else {
node[property] = value;
}
},
_effectEffects: function (property, value, effects, old, fromAbove) {
for (var i = 0, l = effects.length, fx; i < l && (fx = effects[i]); i++) {
fx.fn.call(this, property, value, fx.effect, old, fromAbove);
}
},
_clearPath: function (path) {
for (var prop in this.__data__) {
if (prop.indexOf(path + '.') === 0) {
this.__data__[prop] = undefined;
}
}
}
},
ensurePropertyEffects: function (model, property) {
if (!model._propertyEffects) {
model._propertyEffects = {};
}
var fx = model._propertyEffects[property];
if (!fx) {
fx = model._propertyEffects[property] = [];
}
return fx;
},
addPropertyEffect: function (model, property, kind, effect) {
var fx = this.ensurePropertyEffects(model, property);
var propEffect = {
kind: kind,
effect: effect,
fn: Polymer.Bind['_' + kind + 'Effect']
};
fx.push(propEffect);
return propEffect;
},
createBindings: function (model) {
var fx$ = model._propertyEffects;
if (fx$) {
for (var n in fx$) {
var fx = fx$[n];
fx.sort(this._sortPropertyEffects);
this._createAccessors(model, n, fx);
}
}
},
_sortPropertyEffects: function () {
var EFFECT_ORDER = {
'compute': 0,
'annotation': 1,
'annotatedComputation': 2,
'reflect': 3,
'notify': 4,
'observer': 5,
'complexObserver': 6,
'function': 7
};
return function (a, b) {
return EFFECT_ORDER[a.kind] - EFFECT_ORDER[b.kind];
};
}(),
_createAccessors: function (model, property, effects) {
var defun = {
get: function () {
return this.__data__[property];
}
};
var setter = function (value) {
this._propertySetter(property, value, effects);
};
var info = model.getPropertyInfo && model.getPropertyInfo(property);
if (info && info.readOnly) {
if (!info.computed) {
model['_set' + this.upper(property)] = setter;
}
} else {
defun.set = setter;
}
Object.defineProperty(model, property, defun);
},
upper: function (name) {
return name[0].toUpperCase() + name.substring(1);
},
_addAnnotatedListener: function (model, index, property, path, event, negated) {
if (!model._bindListeners) {
model._bindListeners = [];
}
var fn = this._notedListenerFactory(property, path, this._isStructured(path), negated);
var eventName = event || Polymer.CaseMap.camelToDashCase(property) + '-changed';
model._bindListeners.push({
index: index,
property: property,
path: path,
changedFn: fn,
event: eventName
});
},
_isStructured: function (path) {
return path.indexOf('.') > 0;
},
_isEventBogus: function (e, target) {
return e.path && e.path[0] !== target;
},
_notedListenerFactory: function (property, path, isStructured, negated) {
return function (target, value, targetPath) {
if (targetPath) {
this._notifyPath(this._fixPath(path, property, targetPath), value);
} else {
value = target[property];
if (negated) {
value = !value;
}
if (!isStructured) {
this[path] = value;
} else {
if (this.__data__[path] != value) {
this.set(path, value);
}
}
}
};
},
prepareInstance: function (inst) {
inst.__data__ = Object.create(null);
},
setupBindListeners: function (inst) {
var b$ = inst._bindListeners;
for (var i = 0, l = b$.length, info; i < l && (info = b$[i]); i++) {
var node = inst._nodes[info.index];
this._addNotifyListener(node, inst, info.event, info.changedFn);
}
},
_addNotifyListener: function (element, context, event, changedFn) {
element.addEventListener(event, function (e) {
return context._notifyListener(changedFn, e);
});
}
};
Polymer.Base.extend(Polymer.Bind, {
_shouldAddListener: function (effect) {
return effect.name && effect.kind != 'attribute' && effect.kind != 'text' && !effect.isCompound && effect.parts[0].mode === '{';
},
_annotationEffect: function (source, value, effect) {
if (source != effect.value) {
value = this._get(effect.value);
this.__data__[effect.value] = value;
}
var calc = effect.negate ? !value : value;
if (!effect.customEvent || this._nodes[effect.index][effect.name] !== calc) {
return this._applyEffectValue(effect, calc);
}
},
_reflectEffect: function (source, value, effect) {
this.reflectPropertyToAttribute(source, effect.attribute, value);
},
_notifyEffect: function (source, value, effect, old, fromAbove) {
if (!fromAbove) {
this._notifyChange(source, effect.event, value);
}
},
_functionEffect: function (source, value, fn, old, fromAbove) {
fn.call(this, source, value, old, fromAbove);
},
_observerEffect: function (source, value, effect, old) {
var fn = this[effect.method];
if (fn) {
fn.call(this, value, old);
} else {
this._warn(this._logf('_observerEffect', 'observer method `' + effect.method + '` not defined'));
}
},
_complexObserverEffect: function (source, value, effect) {
var fn = this[effect.method];
if (fn) {
var args = Polymer.Bind._marshalArgs(this.__data__, effect, source, value);
if (args) {
fn.apply(this, args);
}
} else if (effect.dynamicFn) {
} else {
this._warn(this._logf('_complexObserverEffect', 'observer method `' + effect.method + '` not defined'));
}
},
_computeEffect: function (source, value, effect) {
var fn = this[effect.method];
if (fn) {
var args = Polymer.Bind._marshalArgs(this.__data__, effect, source, value);
if (args) {
var computedvalue = fn.apply(this, args);
this.__setProperty(effect.name, computedvalue);
}
} else if (effect.dynamicFn) {
} else {
this._warn(this._logf('_computeEffect', 'compute method `' + effect.method + '` not defined'));
}
},
_annotatedComputationEffect: function (source, value, effect) {
var computedHost = this._rootDataHost || this;
var fn = computedHost[effect.method];
if (fn) {
var args = Polymer.Bind._marshalArgs(this.__data__, effect, source, value);
if (args) {
var computedvalue = fn.apply(computedHost, args);
if (effect.negate) {
computedvalue = !computedvalue;
}
this._applyEffectValue(effect, computedvalue);
}
} else if (effect.dynamicFn) {
} else {
computedHost._warn(computedHost._logf('_annotatedComputationEffect', 'compute method `' + effect.method + '` not defined'));
}
},
_marshalArgs: function (model, effect, path, value) {
var values = [];
var args = effect.args;
var bailoutEarly = args.length > 1 || effect.dynamicFn;
for (var i = 0, l = args.length; i < l; i++) {
var arg = args[i];
var name = arg.name;
var v;
if (arg.literal) {
v = arg.value;
} else if (arg.structured) {
v = Polymer.Base._get(name, model);
} else {
v = model[name];
}
if (bailoutEarly && v === undefined) {
return;
}
if (arg.wildcard) {
var baseChanged = name.indexOf(path + '.') === 0;
var matches = effect.trigger.name.indexOf(name) === 0 && !baseChanged;
values[i] = {
path: matches ? path : name,
value: matches ? value : v,
base: v
};
} else {
values[i] = v;
}
}
return values;
}
});
Polymer.Base._addFeature({
_addPropertyEffect: function (property, kind, effect) {
var prop = Polymer.Bind.addPropertyEffect(this, property, kind, effect);
prop.pathFn = this['_' + prop.kind + 'PathEffect'];
},
_prepEffects: function () {
Polymer.Bind.prepareModel(this);
this._addAnnotationEffects(this._notes);
},
_prepBindings: function () {
Polymer.Bind.createBindings(this);
},
_addPropertyEffects: function (properties) {
if (properties) {
for (var p in properties) {
var prop = properties[p];
if (prop.observer) {
this._addObserverEffect(p, prop.observer);
}
if (prop.computed) {
prop.readOnly = true;
this._addComputedEffect(p, prop.computed);
}
if (prop.notify) {
this._addPropertyEffect(p, 'notify', { event: Polymer.CaseMap.camelToDashCase(p) + '-changed' });
}
if (prop.reflectToAttribute) {
var attr = Polymer.CaseMap.camelToDashCase(p);
if (attr[0] === '-') {
this._warn(this._logf('_addPropertyEffects', 'Property ' + p + ' cannot be reflected to attribute ' + attr + ' because "-" is not a valid starting attribute name. Use a lowercase first letter for the property instead.'));
} else {
this._addPropertyEffect(p, 'reflect', { attribute: attr });
}
}
if (prop.readOnly) {
Polymer.Bind.ensurePropertyEffects(this, p);
}
}
}
},
_addComputedEffect: function (name, expression) {
var sig = this._parseMethod(expression);
var dynamicFn = sig.dynamicFn;
for (var i = 0, arg; i < sig.args.length && (arg = sig.args[i]); i++) {
this._addPropertyEffect(arg.model, 'compute', {
method: sig.method,
args: sig.args,
trigger: arg,
name: name,
dynamicFn: dynamicFn
});
}
if (dynamicFn) {
this._addPropertyEffect(sig.method, 'compute', {
method: sig.method,
args: sig.args,
trigger: null,
name: name,
dynamicFn: dynamicFn
});
}
},
_addObserverEffect: function (property, observer) {
this._addPropertyEffect(property, 'observer', {
method: observer,
property: property
});
},
_addComplexObserverEffects: function (observers) {
if (observers) {
for (var i = 0, o; i < observers.length && (o = observers[i]); i++) {
this._addComplexObserverEffect(o);
}
}
},
_addComplexObserverEffect: function (observer) {
var sig = this._parseMethod(observer);
if (!sig) {
throw new Error('Malformed observer expression \'' + observer + '\'');
}
var dynamicFn = sig.dynamicFn;
for (var i = 0, arg; i < sig.args.length && (arg = sig.args[i]); i++) {
this._addPropertyEffect(arg.model, 'complexObserver', {
method: sig.method,
args: sig.args,
trigger: arg,
dynamicFn: dynamicFn
});
}
if (dynamicFn) {
this._addPropertyEffect(sig.method, 'complexObserver', {
method: sig.method,
args: sig.args,
trigger: null,
dynamicFn: dynamicFn
});
}
},
_addAnnotationEffects: function (notes) {
for (var i = 0, note; i < notes.length && (note = notes[i]); i++) {
var b$ = note.bindings;
for (var j = 0, binding; j < b$.length && (binding = b$[j]); j++) {
this._addAnnotationEffect(binding, i);
}
}
},
_addAnnotationEffect: function (note, index) {
if (Polymer.Bind._shouldAddListener(note)) {
Polymer.Bind._addAnnotatedListener(this, index, note.name, note.parts[0].value, note.parts[0].event, note.parts[0].negate);
}
for (var i = 0; i < note.parts.length; i++) {
var part = note.parts[i];
if (part.signature) {
this._addAnnotatedComputationEffect(note, part, index);
} else if (!part.literal) {
if (note.kind === 'attribute' && note.name[0] === '-') {
this._warn(this._logf('_addAnnotationEffect', 'Cannot set attribute ' + note.name + ' because "-" is not a valid attribute starting character'));
} else {
this._addPropertyEffect(part.model, 'annotation', {
kind: note.kind,
index: index,
name: note.name,
propertyName: note.propertyName,
value: part.value,
isCompound: note.isCompound,
compoundIndex: part.compoundIndex,
event: part.event,
customEvent: part.customEvent,
negate: part.negate
});
}
}
}
},
_addAnnotatedComputationEffect: function (note, part, index) {
var sig = part.signature;
if (sig.static) {
this.__addAnnotatedComputationEffect('__static__', index, note, part, null);
} else {
for (var i = 0, arg; i < sig.args.length && (arg = sig.args[i]); i++) {
if (!arg.literal) {
this.__addAnnotatedComputationEffect(arg.model, index, note, part, arg);
}
}
if (sig.dynamicFn) {
this.__addAnnotatedComputationEffect(sig.method, index, note, part, null);
}
}
},
__addAnnotatedComputationEffect: function (property, index, note, part, trigger) {
this._addPropertyEffect(property, 'annotatedComputation', {
index: index,
isCompound: note.isCompound,
compoundIndex: part.compoundIndex,
kind: note.kind,
name: note.name,
negate: part.negate,
method: part.signature.method,
args: part.signature.args,
trigger: trigger,
dynamicFn: part.signature.dynamicFn
});
},
_parseMethod: function (expression) {
var m = expression.match(/([^\s]+?)\(([\s\S]*)\)/);
if (m) {
var sig = {
method: m[1],
static: true
};
if (this.getPropertyInfo(sig.method) !== Polymer.nob) {
sig.static = false;
sig.dynamicFn = true;
}
if (m[2].trim()) {
var args = m[2].replace(/\\,/g, '&comma;').split(',');
return this._parseArgs(args, sig);
} else {
sig.args = Polymer.nar;
return sig;
}
}
},
_parseArgs: function (argList, sig) {
sig.args = argList.map(function (rawArg) {
var arg = this._parseArg(rawArg);
if (!arg.literal) {
sig.static = false;
}
return arg;
}, this);
return sig;
},
_parseArg: function (rawArg) {
var arg = rawArg.trim().replace(/&comma;/g, ',').replace(/\\(.)/g, '$1');
var a = { name: arg };
var fc = arg[0];
if (fc === '-') {
fc = arg[1];
}
if (fc >= '0' && fc <= '9') {
fc = '#';
}
switch (fc) {
case '\'':
case '"':
a.value = arg.slice(1, -1);
a.literal = true;
break;
case '#':
a.value = Number(arg);
a.literal = true;
break;
}
if (!a.literal) {
a.model = this._modelForPath(arg);
a.structured = arg.indexOf('.') > 0;
if (a.structured) {
a.wildcard = arg.slice(-2) == '.*';
if (a.wildcard) {
a.name = arg.slice(0, -2);
}
}
}
return a;
},
_marshalInstanceEffects: function () {
Polymer.Bind.prepareInstance(this);
if (this._bindListeners) {
Polymer.Bind.setupBindListeners(this);
}
},
_applyEffectValue: function (info, value) {
var node = this._nodes[info.index];
var property = info.name;
if (info.isCompound) {
var storage = node.__compoundStorage__[property];
storage[info.compoundIndex] = value;
value = storage.join('');
}
if (info.kind == 'attribute') {
this.serializeValueToAttribute(value, property, node);
} else {
if (property === 'className') {
value = this._scopeElementClass(node, value);
}
if (property === 'textContent' || node.localName == 'input' && property == 'value') {
value = value == undefined ? '' : value;
}
var pinfo;
if (!node._propertyInfo || !(pinfo = node._propertyInfo[property]) || !pinfo.readOnly) {
this.__setProperty(property, value, false, node);
}
}
},
_executeStaticEffects: function () {
if (this._propertyEffects && this._propertyEffects.__static__) {
this._effectEffects('__static__', null, this._propertyEffects.__static__);
}
}
});
(function () {
var usePolyfillProto = Polymer.Settings.usePolyfillProto;
Polymer.Base._addFeature({
_setupConfigure: function (initialConfig) {
this._config = {};
this._handlers = [];
this._aboveConfig = null;
if (initialConfig) {
for (var i in initialConfig) {
if (initialConfig[i] !== undefined) {
this._config[i] = initialConfig[i];
}
}
}
},
_marshalAttributes: function () {
this._takeAttributesToModel(this._config);
},
_attributeChangedImpl: function (name) {
var model = this._clientsReadied ? this : this._config;
this._setAttributeToProperty(model, name);
},
_configValue: function (name, value) {
var info = this._propertyInfo[name];
if (!info || !info.readOnly) {
this._config[name] = value;
}
},
_beforeClientsReady: function () {
this._configure();
},
_configure: function () {
this._configureAnnotationReferences();
this._aboveConfig = this.mixin({}, this._config);
var config = {};
for (var i = 0; i < this.behaviors.length; i++) {
this._configureProperties(this.behaviors[i].properties, config);
}
this._configureProperties(this.properties, config);
this.mixin(config, this._aboveConfig);
this._config = config;
if (this._clients && this._clients.length) {
this._distributeConfig(this._config);
}
},
_configureProperties: function (properties, config) {
for (var i in properties) {
var c = properties[i];
if (!usePolyfillProto && this.hasOwnProperty(i) && this._propertyEffects && this._propertyEffects[i]) {
config[i] = this[i];
delete this[i];
} else if (c.value !== undefined) {
var value = c.value;
if (typeof value == 'function') {
value = value.call(this, this._config);
}
config[i] = value;
}
}
},
_distributeConfig: function (config) {
var fx$ = this._propertyEffects;
if (fx$) {
for (var p in config) {
var fx = fx$[p];
if (fx) {
for (var i = 0, l = fx.length, x; i < l && (x = fx[i]); i++) {
if (x.kind === 'annotation' && !x.isCompound) {
var node = this._nodes[x.effect.index];
var name = x.effect.propertyName;
var isAttr = x.effect.kind == 'attribute';
var hasEffect = node._propertyEffects && node._propertyEffects[name];
if (node._configValue && (hasEffect || !isAttr)) {
var value = p === x.effect.value ? config[p] : this._get(x.effect.value, config);
if (isAttr) {
value = node.deserialize(this.serialize(value), node._propertyInfo[name].type);
}
node._configValue(name, value);
}
}
}
}
}
}
},
_afterClientsReady: function () {
this._executeStaticEffects();
this._applyConfig(this._config, this._aboveConfig);
this._flushHandlers();
},
_applyConfig: function (config, aboveConfig) {
for (var n in config) {
if (this[n] === undefined) {
this.__setProperty(n, config[n], n in aboveConfig);
}
}
},
_notifyListener: function (fn, e) {
if (!Polymer.Bind._isEventBogus(e, e.target)) {
var value, path;
if (e.detail) {
value = e.detail.value;
path = e.detail.path;
}
if (!this._clientsReadied) {
this._queueHandler([
fn,
e.target,
value,
path
]);
} else {
return fn.call(this, e.target, value, path);
}
}
},
_queueHandler: function (args) {
this._handlers.push(args);
},
_flushHandlers: function () {
var h$ = this._handlers;
for (var i = 0, l = h$.length, h; i < l && (h = h$[i]); i++) {
h[0].call(this, h[1], h[2], h[3]);
}
this._handlers = [];
}
});
}());
(function () {
'use strict';
Polymer.Base._addFeature({
notifyPath: function (path, value, fromAbove) {
var info = {};
this._get(path, this, info);
if (info.path) {
this._notifyPath(info.path, value, fromAbove);
}
},
_notifyPath: function (path, value, fromAbove) {
var old = this._propertySetter(path, value);
if (old !== value && (old === old || value === value)) {
this._pathEffector(path, value);
if (!fromAbove) {
this._notifyPathUp(path, value);
}
return true;
}
},
_getPathParts: function (path) {
if (Array.isArray(path)) {
var parts = [];
for (var i = 0; i < path.length; i++) {
var args = path[i].toString().split('.');
for (var j = 0; j < args.length; j++) {
parts.push(args[j]);
}
}
return parts;
} else {
return path.toString().split('.');
}
},
set: function (path, value, root) {
var prop = root || this;
var parts = this._getPathParts(path);
var array;
var last = parts[parts.length - 1];
if (parts.length > 1) {
for (var i = 0; i < parts.length - 1; i++) {
var part = parts[i];
if (array && part[0] == '#') {
prop = Polymer.Collection.get(array).getItem(part);
} else {
prop = prop[part];
if (array && parseInt(part, 10) == part) {
parts[i] = Polymer.Collection.get(array).getKey(prop);
}
}
if (!prop) {
return;
}
array = Array.isArray(prop) ? prop : null;
}
if (array) {
var coll = Polymer.Collection.get(array);
var old, key;
if (last[0] == '#') {
key = last;
old = coll.getItem(key);
last = array.indexOf(old);
coll.setItem(key, value);
} else if (parseInt(last, 10) == last) {
old = prop[last];
key = coll.getKey(old);
parts[i] = key;
coll.setItem(key, value);
}
}
prop[last] = value;
if (!root) {
this._notifyPath(parts.join('.'), value);
}
} else {
prop[path] = value;
}
},
get: function (path, root) {
return this._get(path, root);
},
_get: function (path, root, info) {
var prop = root || this;
var parts = this._getPathParts(path);
var array;
for (var i = 0; i < parts.length; i++) {
if (!prop) {
return;
}
var part = parts[i];
if (array && part[0] == '#') {
prop = Polymer.Collection.get(array).getItem(part);
} else {
prop = prop[part];
if (info && array && parseInt(part, 10) == part) {
parts[i] = Polymer.Collection.get(array).getKey(prop);
}
}
array = Array.isArray(prop) ? prop : null;
}
if (info) {
info.path = parts.join('.');
}
return prop;
},
_pathEffector: function (path, value) {
var model = this._modelForPath(path);
var fx$ = this._propertyEffects && this._propertyEffects[model];
if (fx$) {
for (var i = 0, fx; i < fx$.length && (fx = fx$[i]); i++) {
var fxFn = fx.pathFn;
if (fxFn) {
fxFn.call(this, path, value, fx.effect);
}
}
}
if (this._boundPaths) {
this._notifyBoundPaths(path, value);
}
},
_annotationPathEffect: function (path, value, effect) {
if (effect.value === path || effect.value.indexOf(path + '.') === 0) {
Polymer.Bind._annotationEffect.call(this, path, value, effect);
} else if (path.indexOf(effect.value + '.') === 0 && !effect.negate) {
var node = this._nodes[effect.index];
if (node && node._notifyPath) {
var p = this._fixPath(effect.name, effect.value, path);
node._notifyPath(p, value, true);
}
}
},
_complexObserverPathEffect: function (path, value, effect) {
if (this._pathMatchesEffect(path, effect)) {
Polymer.Bind._complexObserverEffect.call(this, path, value, effect);
}
},
_computePathEffect: function (path, value, effect) {
if (this._pathMatchesEffect(path, effect)) {
Polymer.Bind._computeEffect.call(this, path, value, effect);
}
},
_annotatedComputationPathEffect: function (path, value, effect) {
if (this._pathMatchesEffect(path, effect)) {
Polymer.Bind._annotatedComputationEffect.call(this, path, value, effect);
}
},
_pathMatchesEffect: function (path, effect) {
var effectArg = effect.trigger.name;
return effectArg == path || effectArg.indexOf(path + '.') === 0 || effect.trigger.wildcard && path.indexOf(effectArg) === 0;
},
linkPaths: function (to, from) {
this._boundPaths = this._boundPaths || {};
if (from) {
this._boundPaths[to] = from;
} else {
this.unlinkPaths(to);
}
},
unlinkPaths: function (path) {
if (this._boundPaths) {
delete this._boundPaths[path];
}
},
_notifyBoundPaths: function (path, value) {
for (var a in this._boundPaths) {
var b = this._boundPaths[a];
if (path.indexOf(a + '.') == 0) {
this._notifyPath(this._fixPath(b, a, path), value);
} else if (path.indexOf(b + '.') == 0) {
this._notifyPath(this._fixPath(a, b, path), value);
}
}
},
_fixPath: function (property, root, path) {
return property + path.slice(root.length);
},
_notifyPathUp: function (path, value) {
var rootName = this._modelForPath(path);
var dashCaseName = Polymer.CaseMap.camelToDashCase(rootName);
var eventName = dashCaseName + this._EVENT_CHANGED;
this.fire(eventName, {
path: path,
value: value
}, {
bubbles: false,
_useCache: true
});
},
_modelForPath: function (path) {
var dot = path.indexOf('.');
return dot < 0 ? path : path.slice(0, dot);
},
_EVENT_CHANGED: '-changed',
notifySplices: function (path, splices) {
var info = {};
var array = this._get(path, this, info);
this._notifySplices(array, info.path, splices);
},
_notifySplices: function (array, path, splices) {
var change = {
keySplices: Polymer.Collection.applySplices(array, splices),
indexSplices: splices
};
if (!array.hasOwnProperty('splices')) {
Object.defineProperty(array, 'splices', {
configurable: true,
writable: true
});
}
array.splices = change;
this._notifyPath(path + '.splices', change);
this._notifyPath(path + '.length', array.length);
change.keySplices = null;
change.indexSplices = null;
},
_notifySplice: function (array, path, index, added, removed) {
this._notifySplices(array, path, [{
index: index,
addedCount: added,
removed: removed,
object: array,
type: 'splice'
}]);
},
push: function (path) {
var info = {};
var array = this._get(path, this, info);
var args = Array.prototype.slice.call(arguments, 1);
var len = array.length;
var ret = array.push.apply(array, args);
if (args.length) {
this._notifySplice(array, info.path, len, args.length, []);
}
return ret;
},
pop: function (path) {
var info = {};
var array = this._get(path, this, info);
var hadLength = Boolean(array.length);
var args = Array.prototype.slice.call(arguments, 1);
var ret = array.pop.apply(array, args);
if (hadLength) {
this._notifySplice(array, info.path, array.length, 0, [ret]);
}
return ret;
},
splice: function (path, start) {
var info = {};
var array = this._get(path, this, info);
if (start < 0) {
start = array.length - Math.floor(-start);
} else {
start = Math.floor(start);
}
if (!start) {
start = 0;
}
var args = Array.prototype.slice.call(arguments, 1);
var ret = array.splice.apply(array, args);
var addedCount = Math.max(args.length - 2, 0);
if (addedCount || ret.length) {
this._notifySplice(array, info.path, start, addedCount, ret);
}
return ret;
},
shift: function (path) {
var info = {};
var array = this._get(path, this, info);
var hadLength = Boolean(array.length);
var args = Array.prototype.slice.call(arguments, 1);
var ret = array.shift.apply(array, args);
if (hadLength) {
this._notifySplice(array, info.path, 0, 0, [ret]);
}
return ret;
},
unshift: function (path) {
var info = {};
var array = this._get(path, this, info);
var args = Array.prototype.slice.call(arguments, 1);
var ret = array.unshift.apply(array, args);
if (args.length) {
this._notifySplice(array, info.path, 0, args.length, []);
}
return ret;
},
prepareModelNotifyPath: function (model) {
this.mixin(model, {
fire: Polymer.Base.fire,
_getEvent: Polymer.Base._getEvent,
__eventCache: Polymer.Base.__eventCache,
notifyPath: Polymer.Base.notifyPath,
_get: Polymer.Base._get,
_EVENT_CHANGED: Polymer.Base._EVENT_CHANGED,
_notifyPath: Polymer.Base._notifyPath,
_notifyPathUp: Polymer.Base._notifyPathUp,
_pathEffector: Polymer.Base._pathEffector,
_annotationPathEffect: Polymer.Base._annotationPathEffect,
_complexObserverPathEffect: Polymer.Base._complexObserverPathEffect,
_annotatedComputationPathEffect: Polymer.Base._annotatedComputationPathEffect,
_computePathEffect: Polymer.Base._computePathEffect,
_modelForPath: Polymer.Base._modelForPath,
_pathMatchesEffect: Polymer.Base._pathMatchesEffect,
_notifyBoundPaths: Polymer.Base._notifyBoundPaths,
_getPathParts: Polymer.Base._getPathParts
});
}
});
}());
Polymer.Base._addFeature({
resolveUrl: function (url) {
var module = Polymer.DomModule.import(this.is);
var root = '';
if (module) {
var assetPath = module.getAttribute('assetpath') || '';
root = Polymer.ResolveUrl.resolveUrl(assetPath, module.ownerDocument.baseURI);
}
return Polymer.ResolveUrl.resolveUrl(url, root);
}
});
Polymer.CssParse = function () {
return {
parse: function (text) {
text = this._clean(text);
return this._parseCss(this._lex(text), text);
},
_clean: function (cssText) {
return cssText.replace(this._rx.comments, '').replace(this._rx.port, '');
},
_lex: function (text) {
var root = {
start: 0,
end: text.length
};
var n = root;
for (var i = 0, l = text.length; i < l; i++) {
switch (text[i]) {
case this.OPEN_BRACE:
if (!n.rules) {
n.rules = [];
}
var p = n;
var previous = p.rules[p.rules.length - 1];
n = {
start: i + 1,
parent: p,
previous: previous
};
p.rules.push(n);
break;
case this.CLOSE_BRACE:
n.end = i + 1;
n = n.parent || root;
break;
}
}
return root;
},
_parseCss: function (node, text) {
var t = text.substring(node.start, node.end - 1);
node.parsedCssText = node.cssText = t.trim();
if (node.parent) {
var ss = node.previous ? node.previous.end : node.parent.start;
t = text.substring(ss, node.start - 1);
t = this._expandUnicodeEscapes(t);
t = t.replace(this._rx.multipleSpaces, ' ');
t = t.substring(t.lastIndexOf(';') + 1);
var s = node.parsedSelector = node.selector = t.trim();
node.atRule = s.indexOf(this.AT_START) === 0;
if (node.atRule) {
if (s.indexOf(this.MEDIA_START) === 0) {
node.type = this.types.MEDIA_RULE;
} else if (s.match(this._rx.keyframesRule)) {
node.type = this.types.KEYFRAMES_RULE;
node.keyframesName = node.selector.split(this._rx.multipleSpaces).pop();
}
} else {
if (s.indexOf(this.VAR_START) === 0) {
node.type = this.types.MIXIN_RULE;
} else {
node.type = this.types.STYLE_RULE;
}
}
}
var r$ = node.rules;
if (r$) {
for (var i = 0, l = r$.length, r; i < l && (r = r$[i]); i++) {
this._parseCss(r, text);
}
}
return node;
},
_expandUnicodeEscapes: function (s) {
return s.replace(/\\([0-9a-f]{1,6})\s/gi, function () {
var code = arguments[1], repeat = 6 - code.length;
while (repeat--) {
code = '0' + code;
}
return '\\' + code;
});
},
stringify: function (node, preserveProperties, text) {
text = text || '';
var cssText = '';
if (node.cssText || node.rules) {
var r$ = node.rules;
if (r$ && (preserveProperties || !this._hasMixinRules(r$))) {
for (var i = 0, l = r$.length, r; i < l && (r = r$[i]); i++) {
cssText = this.stringify(r, preserveProperties, cssText);
}
} else {
cssText = preserveProperties ? node.cssText : this.removeCustomProps(node.cssText);
cssText = cssText.trim();
if (cssText) {
cssText = '  ' + cssText + '\n';
}
}
}
if (cssText) {
if (node.selector) {
text += node.selector + ' ' + this.OPEN_BRACE + '\n';
}
text += cssText;
if (node.selector) {
text += this.CLOSE_BRACE + '\n\n';
}
}
return text;
},
_hasMixinRules: function (rules) {
return rules[0].selector.indexOf(this.VAR_START) === 0;
},
removeCustomProps: function (cssText) {
cssText = this.removeCustomPropAssignment(cssText);
return this.removeCustomPropApply(cssText);
},
removeCustomPropAssignment: function (cssText) {
return cssText.replace(this._rx.customProp, '').replace(this._rx.mixinProp, '');
},
removeCustomPropApply: function (cssText) {
return cssText.replace(this._rx.mixinApply, '').replace(this._rx.varApply, '');
},
types: {
STYLE_RULE: 1,
KEYFRAMES_RULE: 7,
MEDIA_RULE: 4,
MIXIN_RULE: 1000
},
OPEN_BRACE: '{',
CLOSE_BRACE: '}',
_rx: {
comments: /\/\*[^*]*\*+([^\/*][^*]*\*+)*\//gim,
port: /@import[^;]*;/gim,
customProp: /(?:^[^;\-\s}]+)?--[^;{}]*?:[^{};]*?(?:[;\n]|$)/gim,
mixinProp: /(?:^[^;\-\s}]+)?--[^;{}]*?:[^{};]*?{[^}]*?}(?:[;\n]|$)?/gim,
mixinApply: /@apply[\s]*\([^)]*?\)[\s]*(?:[;\n]|$)?/gim,
varApply: /[^;:]*?:[^;]*?var\([^;]*\)(?:[;\n]|$)?/gim,
keyframesRule: /^@[^\s]*keyframes/,
multipleSpaces: /\s+/g
},
VAR_START: '--',
MEDIA_START: '@media',
AT_START: '@'
};
}();
Polymer.StyleUtil = function () {
return {
MODULE_STYLES_SELECTOR: 'style, link[rel=import][type~=css], template',
INCLUDE_ATTR: 'include',
toCssText: function (rules, callback, preserveProperties) {
if (typeof rules === 'string') {
rules = this.parser.parse(rules);
}
if (callback) {
this.forEachRule(rules, callback);
}
return this.parser.stringify(rules, preserveProperties);
},
forRulesInStyles: function (styles, styleRuleCallback, keyframesRuleCallback) {
if (styles) {
for (var i = 0, l = styles.length, s; i < l && (s = styles[i]); i++) {
this.forEachRule(this.rulesForStyle(s), styleRuleCallback, keyframesRuleCallback);
}
}
},
rulesForStyle: function (style) {
if (!style.__cssRules && style.textContent) {
style.__cssRules = this.parser.parse(style.textContent);
}
return style.__cssRules;
},
isKeyframesSelector: function (rule) {
return rule.parent && rule.parent.type === this.ruleTypes.KEYFRAMES_RULE;
},
forEachRule: function (node, styleRuleCallback, keyframesRuleCallback) {
if (!node) {
return;
}
var skipRules = false;
if (node.type === this.ruleTypes.STYLE_RULE) {
styleRuleCallback(node);
} else if (keyframesRuleCallback && node.type === this.ruleTypes.KEYFRAMES_RULE) {
keyframesRuleCallback(node);
} else if (node.type === this.ruleTypes.MIXIN_RULE) {
skipRules = true;
}
var r$ = node.rules;
if (r$ && !skipRules) {
for (var i = 0, l = r$.length, r; i < l && (r = r$[i]); i++) {
this.forEachRule(r, styleRuleCallback, keyframesRuleCallback);
}
}
},
applyCss: function (cssText, moniker, target, contextNode) {
var style = this.createScopeStyle(cssText, moniker);
target = target || document.head;
var after = contextNode && contextNode.nextSibling || target.firstChild;
this.__lastHeadApplyNode = style;
return target.insertBefore(style, after);
},
createScopeStyle: function (cssText, moniker) {
var style = document.createElement('style');
if (moniker) {
style.setAttribute('scope', moniker);
}
style.textContent = cssText;
return style;
},
__lastHeadApplyNode: null,
applyStylePlaceHolder: function (moniker) {
var placeHolder = document.createComment(' Shady DOM styles for ' + moniker + ' ');
var after = this.__lastHeadApplyNode ? this.__lastHeadApplyNode.nextSibling : null;
var scope = document.head;
scope.insertBefore(placeHolder, after || scope.firstChild);
this.__lastHeadApplyNode = placeHolder;
return placeHolder;
},
cssFromModules: function (moduleIds, warnIfNotFound) {
var modules = moduleIds.trim().split(' ');
var cssText = '';
for (var i = 0; i < modules.length; i++) {
cssText += this.cssFromModule(modules[i], warnIfNotFound);
}
return cssText;
},
cssFromModule: function (moduleId, warnIfNotFound) {
var m = Polymer.DomModule.import(moduleId);
if (m && !m._cssText) {
m._cssText = this.cssFromElement(m);
}
if (!m && warnIfNotFound) {
console.warn('Could not find style data in module named', moduleId);
}
return m && m._cssText || '';
},
cssFromElement: function (element) {
var cssText = '';
var content = element.content || element;
var e$ = Polymer.TreeApi.arrayCopy(content.querySelectorAll(this.MODULE_STYLES_SELECTOR));
for (var i = 0, e; i < e$.length; i++) {
e = e$[i];
if (e.localName === 'template') {
cssText += this.cssFromElement(e);
} else {
if (e.localName === 'style') {
var include = e.getAttribute(this.INCLUDE_ATTR);
if (include) {
cssText += this.cssFromModules(include, true);
}
e = e.__appliedElement || e;
e.parentNode.removeChild(e);
cssText += this.resolveCss(e.textContent, element.ownerDocument);
} else if (e.import && e.import.body) {
cssText += this.resolveCss(e.import.body.textContent, e.import);
}
}
}
return cssText;
},
resolveCss: Polymer.ResolveUrl.resolveCss,
parser: Polymer.CssParse,
ruleTypes: Polymer.CssParse.types
};
}();
Polymer.StyleTransformer = function () {
var nativeShadow = Polymer.Settings.useNativeShadow;
var styleUtil = Polymer.StyleUtil;
var api = {
dom: function (node, scope, useAttr, shouldRemoveScope) {
this._transformDom(node, scope || '', useAttr, shouldRemoveScope);
},
_transformDom: function (node, selector, useAttr, shouldRemoveScope) {
if (node.setAttribute) {
this.element(node, selector, useAttr, shouldRemoveScope);
}
var c$ = Polymer.dom(node).childNodes;
for (var i = 0; i < c$.length; i++) {
this._transformDom(c$[i], selector, useAttr, shouldRemoveScope);
}
},
element: function (element, scope, useAttr, shouldRemoveScope) {
if (useAttr) {
if (shouldRemoveScope) {
element.removeAttribute(SCOPE_NAME);
} else {
element.setAttribute(SCOPE_NAME, scope);
}
} else {
if (scope) {
if (element.classList) {
if (shouldRemoveScope) {
element.classList.remove(SCOPE_NAME);
element.classList.remove(scope);
} else {
element.classList.add(SCOPE_NAME);
element.classList.add(scope);
}
} else if (element.getAttribute) {
var c = element.getAttribute(CLASS);
if (shouldRemoveScope) {
if (c) {
element.setAttribute(CLASS, c.replace(SCOPE_NAME, '').replace(scope, ''));
}
} else {
element.setAttribute(CLASS, (c ? c + ' ' : '') + SCOPE_NAME + ' ' + scope);
}
}
}
}
},
elementStyles: function (element, callback) {
var styles = element._styles;
var cssText = '';
for (var i = 0, l = styles.length, s; i < l && (s = styles[i]); i++) {
var rules = styleUtil.rulesForStyle(s);
cssText += nativeShadow ? styleUtil.toCssText(rules, callback) : this.css(rules, element.is, element.extends, callback, element._scopeCssViaAttr) + '\n\n';
}
return cssText.trim();
},
css: function (rules, scope, ext, callback, useAttr) {
var hostScope = this._calcHostScope(scope, ext);
scope = this._calcElementScope(scope, useAttr);
var self = this;
return styleUtil.toCssText(rules, function (rule) {
if (!rule.isScoped) {
self.rule(rule, scope, hostScope);
rule.isScoped = true;
}
if (callback) {
callback(rule, scope, hostScope);
}
});
},
_calcElementScope: function (scope, useAttr) {
if (scope) {
return useAttr ? CSS_ATTR_PREFIX + scope + CSS_ATTR_SUFFIX : CSS_CLASS_PREFIX + scope;
} else {
return '';
}
},
_calcHostScope: function (scope, ext) {
return ext ? '[is=' + scope + ']' : scope;
},
rule: function (rule, scope, hostScope) {
this._transformRule(rule, this._transformComplexSelector, scope, hostScope);
},
_transformRule: function (rule, transformer, scope, hostScope) {
var p$ = rule.selector.split(COMPLEX_SELECTOR_SEP);
if (!styleUtil.isKeyframesSelector(rule)) {
for (var i = 0, l = p$.length, p; i < l && (p = p$[i]); i++) {
p$[i] = transformer.call(this, p, scope, hostScope);
}
}
rule.selector = rule.transformedSelector = p$.join(COMPLEX_SELECTOR_SEP);
},
_transformComplexSelector: function (selector, scope, hostScope) {
var stop = false;
var hostContext = false;
var self = this;
selector = selector.replace(CONTENT_START, HOST + ' $1');
selector = selector.replace(SIMPLE_SELECTOR_SEP, function (m, c, s) {
if (!stop) {
var info = self._transformCompoundSelector(s, c, scope, hostScope);
stop = stop || info.stop;
hostContext = hostContext || info.hostContext;
c = info.combinator;
s = info.value;
} else {
s = s.replace(SCOPE_JUMP, ' ');
}
return c + s;
});
if (hostContext) {
selector = selector.replace(HOST_CONTEXT_PAREN, function (m, pre, paren, post) {
return pre + paren + ' ' + hostScope + post + COMPLEX_SELECTOR_SEP + ' ' + pre + hostScope + paren + post;
});
}
return selector;
},
_transformCompoundSelector: function (selector, combinator, scope, hostScope) {
var jumpIndex = selector.search(SCOPE_JUMP);
var hostContext = false;
if (selector.indexOf(HOST_CONTEXT) >= 0) {
hostContext = true;
} else if (selector.indexOf(HOST) >= 0) {
selector = selector.replace(HOST_PAREN, function (m, host, paren) {
return hostScope + paren;
});
selector = selector.replace(HOST, hostScope);
} else if (jumpIndex !== 0) {
selector = scope ? this._transformSimpleSelector(selector, scope) : selector;
}
if (selector.indexOf(CONTENT) >= 0) {
combinator = '';
}
var stop;
if (jumpIndex >= 0) {
selector = selector.replace(SCOPE_JUMP, ' ');
stop = true;
}
return {
value: selector,
combinator: combinator,
stop: stop,
hostContext: hostContext
};
},
_transformSimpleSelector: function (selector, scope) {
var p$ = selector.split(PSEUDO_PREFIX);
p$[0] += scope;
return p$.join(PSEUDO_PREFIX);
},
documentRule: function (rule) {
rule.selector = rule.parsedSelector;
this.normalizeRootSelector(rule);
if (!nativeShadow) {
this._transformRule(rule, this._transformDocumentSelector);
}
},
normalizeRootSelector: function (rule) {
if (rule.selector === ROOT) {
rule.selector = 'body';
}
},
_transformDocumentSelector: function (selector) {
return selector.match(SCOPE_JUMP) ? this._transformComplexSelector(selector, SCOPE_DOC_SELECTOR) : this._transformSimpleSelector(selector.trim(), SCOPE_DOC_SELECTOR);
},
SCOPE_NAME: 'style-scope'
};
var SCOPE_NAME = api.SCOPE_NAME;
var SCOPE_DOC_SELECTOR = ':not([' + SCOPE_NAME + '])' + ':not(.' + SCOPE_NAME + ')';
var COMPLEX_SELECTOR_SEP = ',';
var SIMPLE_SELECTOR_SEP = /(^|[\s>+~]+)((?:\[.+?\]|[^\s>+~=\[])+)/g;
var HOST = ':host';
var ROOT = ':root';
var HOST_PAREN = /(:host)(?:\(((?:\([^)(]*\)|[^)(]*)+?)\))/g;
var HOST_CONTEXT = ':host-context';
var HOST_CONTEXT_PAREN = /(.*)(?::host-context)(?:\(((?:\([^)(]*\)|[^)(]*)+?)\))(.*)/;
var CONTENT = '::content';
var SCOPE_JUMP = /::content|::shadow|\/deep\//;
var CSS_CLASS_PREFIX = '.';
var CSS_ATTR_PREFIX = '[' + SCOPE_NAME + '~=';
var CSS_ATTR_SUFFIX = ']';
var PSEUDO_PREFIX = ':';
var CLASS = 'class';
var CONTENT_START = new RegExp('^(' + CONTENT + ')');
return api;
}();
Polymer.StyleExtends = function () {
var styleUtil = Polymer.StyleUtil;
return {
hasExtends: function (cssText) {
return Boolean(cssText.match(this.rx.EXTEND));
},
transform: function (style) {
var rules = styleUtil.rulesForStyle(style);
var self = this;
styleUtil.forEachRule(rules, function (rule) {
self._mapRuleOntoParent(rule);
if (rule.parent) {
var m;
while (m = self.rx.EXTEND.exec(rule.cssText)) {
var extend = m[1];
var extendor = self._findExtendor(extend, rule);
if (extendor) {
self._extendRule(rule, extendor);
}
}
}
rule.cssText = rule.cssText.replace(self.rx.EXTEND, '');
});
return styleUtil.toCssText(rules, function (rule) {
if (rule.selector.match(self.rx.STRIP)) {
rule.cssText = '';
}
}, true);
},
_mapRuleOntoParent: function (rule) {
if (rule.parent) {
var map = rule.parent.map || (rule.parent.map = {});
var parts = rule.selector.split(',');
for (var i = 0, p; i < parts.length; i++) {
p = parts[i];
map[p.trim()] = rule;
}
return map;
}
},
_findExtendor: function (extend, rule) {
return rule.parent && rule.parent.map && rule.parent.map[extend] || this._findExtendor(extend, rule.parent);
},
_extendRule: function (target, source) {
if (target.parent !== source.parent) {
this._cloneAndAddRuleToParent(source, target.parent);
}
target.extends = target.extends || [];
target.extends.push(source);
source.selector = source.selector.replace(this.rx.STRIP, '');
source.selector = (source.selector && source.selector + ',\n') + target.selector;
if (source.extends) {
source.extends.forEach(function (e) {
this._extendRule(target, e);
}, this);
}
},
_cloneAndAddRuleToParent: function (rule, parent) {
rule = Object.create(rule);
rule.parent = parent;
if (rule.extends) {
rule.extends = rule.extends.slice();
}
parent.rules.push(rule);
},
rx: {
EXTEND: /@extends\(([^)]*)\)\s*?;/gim,
STRIP: /%[^,]*$/
}
};
}();
(function () {
var prepElement = Polymer.Base._prepElement;
var nativeShadow = Polymer.Settings.useNativeShadow;
var styleUtil = Polymer.StyleUtil;
var styleTransformer = Polymer.StyleTransformer;
var styleExtends = Polymer.StyleExtends;
Polymer.Base._addFeature({
_prepElement: function (element) {
if (this._encapsulateStyle) {
styleTransformer.element(element, this.is, this._scopeCssViaAttr);
}
prepElement.call(this, element);
},
_prepStyles: function () {
if (!nativeShadow) {
this._scopeStyle = styleUtil.applyStylePlaceHolder(this.is);
}
},
_prepShimStyles: function () {
if (this._template) {
if (this._encapsulateStyle === undefined) {
this._encapsulateStyle = !nativeShadow;
}
this._styles = this._collectStyles();
var cssText = styleTransformer.elementStyles(this);
this._prepStyleProperties();
if (!this._needsStyleProperties() && this._styles.length) {
styleUtil.applyCss(cssText, this.is, nativeShadow ? this._template.content : null, this._scopeStyle);
}
} else {
this._styles = [];
}
},
_collectStyles: function () {
var styles = [];
var cssText = '', m$ = this.styleModules;
if (m$) {
for (var i = 0, l = m$.length, m; i < l && (m = m$[i]); i++) {
cssText += styleUtil.cssFromModule(m);
}
}
cssText += styleUtil.cssFromModule(this.is);
var p = this._template && this._template.parentNode;
if (this._template && (!p || p.id.toLowerCase() !== this.is)) {
cssText += styleUtil.cssFromElement(this._template);
}
if (cssText) {
var style = document.createElement('style');
style.textContent = cssText;
if (styleExtends.hasExtends(style.textContent)) {
cssText = styleExtends.transform(style);
}
styles.push(style);
}
return styles;
},
_elementAdd: function (node) {
if (this._encapsulateStyle) {
if (node.__styleScoped) {
node.__styleScoped = false;
} else {
styleTransformer.dom(node, this.is, this._scopeCssViaAttr);
}
}
},
_elementRemove: function (node) {
if (this._encapsulateStyle) {
styleTransformer.dom(node, this.is, this._scopeCssViaAttr, true);
}
},
scopeSubtree: function (container, shouldObserve) {
if (nativeShadow) {
return;
}
var self = this;
var scopify = function (node) {
if (node.nodeType === Node.ELEMENT_NODE) {
var className = node.getAttribute('class');
node.setAttribute('class', self._scopeElementClass(node, className));
var n$ = node.querySelectorAll('*');
for (var i = 0, n; i < n$.length && (n = n$[i]); i++) {
className = n.getAttribute('class');
n.setAttribute('class', self._scopeElementClass(n, className));
}
}
};
scopify(container);
if (shouldObserve) {
var mo = new MutationObserver(function (mxns) {
for (var i = 0, m; i < mxns.length && (m = mxns[i]); i++) {
if (m.addedNodes) {
for (var j = 0; j < m.addedNodes.length; j++) {
scopify(m.addedNodes[j]);
}
}
}
});
mo.observe(container, {
childList: true,
subtree: true
});
return mo;
}
}
});
}());
Polymer.StyleProperties = function () {
'use strict';
var nativeShadow = Polymer.Settings.useNativeShadow;
var matchesSelector = Polymer.DomApi.matchesSelector;
var styleUtil = Polymer.StyleUtil;
var styleTransformer = Polymer.StyleTransformer;
return {
decorateStyles: function (styles) {
var self = this, props = {}, keyframes = [];
styleUtil.forRulesInStyles(styles, function (rule) {
self.decorateRule(rule);
self.collectPropertiesInCssText(rule.propertyInfo.cssText, props);
}, function onKeyframesRule(rule) {
keyframes.push(rule);
});
styles._keyframes = keyframes;
var names = [];
for (var i in props) {
names.push(i);
}
return names;
},
decorateRule: function (rule) {
if (rule.propertyInfo) {
return rule.propertyInfo;
}
var info = {}, properties = {};
var hasProperties = this.collectProperties(rule, properties);
if (hasProperties) {
info.properties = properties;
rule.rules = null;
}
info.cssText = this.collectCssText(rule);
rule.propertyInfo = info;
return info;
},
collectProperties: function (rule, properties) {
var info = rule.propertyInfo;
if (info) {
if (info.properties) {
Polymer.Base.mixin(properties, info.properties);
return true;
}
} else {
var m, rx = this.rx.VAR_ASSIGN;
var cssText = rule.parsedCssText;
var any;
while (m = rx.exec(cssText)) {
properties[m[1]] = (m[2] || m[3]).trim();
any = true;
}
return any;
}
},
collectCssText: function (rule) {
return this.collectConsumingCssText(rule.parsedCssText);
},
collectConsumingCssText: function (cssText) {
return cssText.replace(this.rx.BRACKETED, '').replace(this.rx.VAR_ASSIGN, '');
},
collectPropertiesInCssText: function (cssText, props) {
var m;
while (m = this.rx.VAR_CAPTURE.exec(cssText)) {
props[m[1]] = true;
var def = m[2];
if (def && def.match(this.rx.IS_VAR)) {
props[def] = true;
}
}
},
reify: function (props) {
var names = Object.getOwnPropertyNames(props);
for (var i = 0, n; i < names.length; i++) {
n = names[i];
props[n] = this.valueForProperty(props[n], props);
}
},
valueForProperty: function (property, props) {
if (property) {
if (property.indexOf(';') >= 0) {
property = this.valueForProperties(property, props);
} else {
var self = this;
var fn = function (all, prefix, value, fallback) {
var propertyValue = self.valueForProperty(props[value], props) || (props[fallback] ? self.valueForProperty(props[fallback], props) : fallback);
return prefix + (propertyValue || '');
};
property = property.replace(this.rx.VAR_MATCH, fn);
}
}
return property && property.trim() || '';
},
valueForProperties: function (property, props) {
var parts = property.split(';');
for (var i = 0, p, m; i < parts.length; i++) {
if (p = parts[i]) {
m = p.match(this.rx.MIXIN_MATCH);
if (m) {
p = this.valueForProperty(props[m[1]], props);
} else {
var colon = p.indexOf(':');
if (colon !== -1) {
var pp = p.substring(colon);
pp = pp.trim();
pp = this.valueForProperty(pp, props) || pp;
p = p.substring(0, colon) + pp;
}
}
parts[i] = p && p.lastIndexOf(';') === p.length - 1 ? p.slice(0, -1) : p || '';
}
}
return parts.join(';');
},
applyProperties: function (rule, props) {
var output = '';
if (!rule.propertyInfo) {
this.decorateRule(rule);
}
if (rule.propertyInfo.cssText) {
output = this.valueForProperties(rule.propertyInfo.cssText, props);
}
rule.cssText = output;
},
applyKeyframeTransforms: function (rule, keyframeTransforms) {
var input = rule.cssText;
var output = rule.cssText;
if (rule.hasAnimations == null) {
rule.hasAnimations = this.rx.ANIMATION_MATCH.test(input);
}
if (rule.hasAnimations) {
var transform;
if (rule.keyframeNamesToTransform == null) {
rule.keyframeNamesToTransform = [];
for (var keyframe in keyframeTransforms) {
transform = keyframeTransforms[keyframe];
output = transform(input);
if (input !== output) {
input = output;
rule.keyframeNamesToTransform.push(keyframe);
}
}
} else {
for (var i = 0; i < rule.keyframeNamesToTransform.length; ++i) {
transform = keyframeTransforms[rule.keyframeNamesToTransform[i]];
input = transform(input);
}
output = input;
}
}
rule.cssText = output;
},
propertyDataFromStyles: function (styles, element) {
var props = {}, self = this;
var o = [], i = 0;
styleUtil.forRulesInStyles(styles, function (rule) {
if (!rule.propertyInfo) {
self.decorateRule(rule);
}
if (element && rule.propertyInfo.properties && matchesSelector.call(element, rule.transformedSelector || rule.parsedSelector)) {
self.collectProperties(rule, props);
addToBitMask(i, o);
}
i++;
});
return {
properties: props,
key: o
};
},
scopePropertiesFromStyles: function (styles) {
if (!styles._scopeStyleProperties) {
styles._scopeStyleProperties = this.selectedPropertiesFromStyles(styles, this.SCOPE_SELECTORS);
}
return styles._scopeStyleProperties;
},
hostPropertiesFromStyles: function (styles) {
if (!styles._hostStyleProperties) {
styles._hostStyleProperties = this.selectedPropertiesFromStyles(styles, this.HOST_SELECTORS);
}
return styles._hostStyleProperties;
},
selectedPropertiesFromStyles: function (styles, selectors) {
var props = {}, self = this;
styleUtil.forRulesInStyles(styles, function (rule) {
if (!rule.propertyInfo) {
self.decorateRule(rule);
}
for (var i = 0; i < selectors.length; i++) {
if (rule.parsedSelector === selectors[i]) {
self.collectProperties(rule, props);
return;
}
}
});
return props;
},
transformStyles: function (element, properties, scopeSelector) {
var self = this;
var hostSelector = styleTransformer._calcHostScope(element.is, element.extends);
var rxHostSelector = element.extends ? '\\' + hostSelector.slice(0, -1) + '\\]' : hostSelector;
var hostRx = new RegExp(this.rx.HOST_PREFIX + rxHostSelector + this.rx.HOST_SUFFIX);
var keyframeTransforms = this._elementKeyframeTransforms(element, scopeSelector);
return styleTransformer.elementStyles(element, function (rule) {
self.applyProperties(rule, properties);
if (!nativeShadow && !Polymer.StyleUtil.isKeyframesSelector(rule) && rule.cssText) {
self.applyKeyframeTransforms(rule, keyframeTransforms);
self._scopeSelector(rule, hostRx, hostSelector, element._scopeCssViaAttr, scopeSelector);
}
});
},
_elementKeyframeTransforms: function (element, scopeSelector) {
var keyframesRules = element._styles._keyframes;
var keyframeTransforms = {};
if (!nativeShadow && keyframesRules) {
for (var i = 0, keyframesRule = keyframesRules[i]; i < keyframesRules.length; keyframesRule = keyframesRules[++i]) {
this._scopeKeyframes(keyframesRule, scopeSelector);
keyframeTransforms[keyframesRule.keyframesName] = this._keyframesRuleTransformer(keyframesRule);
}
}
return keyframeTransforms;
},
_keyframesRuleTransformer: function (keyframesRule) {
return function (cssText) {
return cssText.replace(keyframesRule.keyframesNameRx, keyframesRule.transformedKeyframesName);
};
},
_scopeKeyframes: function (rule, scopeId) {
rule.keyframesNameRx = new RegExp(rule.keyframesName, 'g');
rule.transformedKeyframesName = rule.keyframesName + '-' + scopeId;
rule.transformedSelector = rule.transformedSelector || rule.selector;
rule.selector = rule.transformedSelector.replace(rule.keyframesName, rule.transformedKeyframesName);
},
_scopeSelector: function (rule, hostRx, hostSelector, viaAttr, scopeId) {
rule.transformedSelector = rule.transformedSelector || rule.selector;
var selector = rule.transformedSelector;
var scope = viaAttr ? '[' + styleTransformer.SCOPE_NAME + '~=' + scopeId + ']' : '.' + scopeId;
var parts = selector.split(',');
for (var i = 0, l = parts.length, p; i < l && (p = parts[i]); i++) {
parts[i] = p.match(hostRx) ? p.replace(hostSelector, scope) : scope + ' ' + p;
}
rule.selector = parts.join(',');
},
applyElementScopeSelector: function (element, selector, old, viaAttr) {
var c = viaAttr ? element.getAttribute(styleTransformer.SCOPE_NAME) : element.getAttribute('class') || '';
var v = old ? c.replace(old, selector) : (c ? c + ' ' : '') + this.XSCOPE_NAME + ' ' + selector;
if (c !== v) {
if (viaAttr) {
element.setAttribute(styleTransformer.SCOPE_NAME, v);
} else {
element.setAttribute('class', v);
}
}
},
applyElementStyle: function (element, properties, selector, style) {
var cssText = style ? style.textContent || '' : this.transformStyles(element, properties, selector);
var s = element._customStyle;
if (s && !nativeShadow && s !== style) {
s._useCount--;
if (s._useCount <= 0 && s.parentNode) {
s.parentNode.removeChild(s);
}
}
if (nativeShadow || (!style || !style.parentNode)) {
if (nativeShadow && element._customStyle) {
element._customStyle.textContent = cssText;
style = element._customStyle;
} else if (cssText) {
style = styleUtil.applyCss(cssText, selector, nativeShadow ? element.root : null, element._scopeStyle);
}
}
if (style) {
style._useCount = style._useCount || 0;
if (element._customStyle != style) {
style._useCount++;
}
element._customStyle = style;
}
return style;
},
mixinCustomStyle: function (props, customStyle) {
var v;
for (var i in customStyle) {
v = customStyle[i];
if (v || v === 0) {
props[i] = v;
}
}
},
rx: {
VAR_ASSIGN: /(?:^|[;\s{]\s*)(--[\w-]*?)\s*:\s*(?:([^;{]*)|{([^}]*)})(?:(?=[;\s}])|$)/gi,
MIXIN_MATCH: /(?:^|\W+)@apply[\s]*\(([^)]*)\)/i,
VAR_MATCH: /(^|\W+)var\([\s]*([^,)]*)[\s]*,?[\s]*((?:[^,()]*)|(?:[^;()]*\([^;)]*\)))[\s]*?\)/gi,
VAR_CAPTURE: /\([\s]*(--[^,\s)]*)(?:,[\s]*(--[^,\s)]*))?(?:\)|,)/gi,
ANIMATION_MATCH: /(animation\s*:)|(animation-name\s*:)/,
IS_VAR: /^--/,
BRACKETED: /\{[^}]*\}/g,
HOST_PREFIX: '(?:^|[^.#[:])',
HOST_SUFFIX: '($|[.:[\\s>+~])'
},
HOST_SELECTORS: [':host'],
SCOPE_SELECTORS: [':root'],
XSCOPE_NAME: 'x-scope'
};
function addToBitMask(n, bits) {
var o = parseInt(n / 32);
var v = 1 << n % 32;
bits[o] = (bits[o] || 0) | v;
}
}();
(function () {
Polymer.StyleCache = function () {
this.cache = {};
};
Polymer.StyleCache.prototype = {
MAX: 100,
store: function (is, data, keyValues, keyStyles) {
data.keyValues = keyValues;
data.styles = keyStyles;
var s$ = this.cache[is] = this.cache[is] || [];
s$.push(data);
if (s$.length > this.MAX) {
s$.shift();
}
},
retrieve: function (is, keyValues, keyStyles) {
var cache = this.cache[is];
if (cache) {
for (var i = cache.length - 1, data; i >= 0; i--) {
data = cache[i];
if (keyStyles === data.styles && this._objectsEqual(keyValues, data.keyValues)) {
return data;
}
}
}
},
clear: function () {
this.cache = {};
},
_objectsEqual: function (target, source) {
var t, s;
for (var i in target) {
t = target[i], s = source[i];
if (!(typeof t === 'object' && t ? this._objectsStrictlyEqual(t, s) : t === s)) {
return false;
}
}
if (Array.isArray(target)) {
return target.length === source.length;
}
return true;
},
_objectsStrictlyEqual: function (target, source) {
return this._objectsEqual(target, source) && this._objectsEqual(source, target);
}
};
}());
Polymer.StyleDefaults = function () {
var styleProperties = Polymer.StyleProperties;
var StyleCache = Polymer.StyleCache;
var api = {
_styles: [],
_properties: null,
customStyle: {},
_styleCache: new StyleCache(),
addStyle: function (style) {
this._styles.push(style);
this._properties = null;
},
get _styleProperties() {
if (!this._properties) {
styleProperties.decorateStyles(this._styles);
this._styles._scopeStyleProperties = null;
this._properties = styleProperties.scopePropertiesFromStyles(this._styles);
styleProperties.mixinCustomStyle(this._properties, this.customStyle);
styleProperties.reify(this._properties);
}
return this._properties;
},
_needsStyleProperties: function () {
},
_computeStyleProperties: function () {
return this._styleProperties;
},
updateStyles: function (properties) {
this._properties = null;
if (properties) {
Polymer.Base.mixin(this.customStyle, properties);
}
this._styleCache.clear();
for (var i = 0, s; i < this._styles.length; i++) {
s = this._styles[i];
s = s.__importElement || s;
s._apply();
}
}
};
return api;
}();
(function () {
'use strict';
var serializeValueToAttribute = Polymer.Base.serializeValueToAttribute;
var propertyUtils = Polymer.StyleProperties;
var styleTransformer = Polymer.StyleTransformer;
var styleDefaults = Polymer.StyleDefaults;
var nativeShadow = Polymer.Settings.useNativeShadow;
Polymer.Base._addFeature({
_prepStyleProperties: function () {
this._ownStylePropertyNames = this._styles && this._styles.length ? propertyUtils.decorateStyles(this._styles) : null;
},
customStyle: null,
getComputedStyleValue: function (property) {
return this._styleProperties && this._styleProperties[property] || getComputedStyle(this).getPropertyValue(property);
},
_setupStyleProperties: function () {
this.customStyle = {};
this._styleCache = null;
this._styleProperties = null;
this._scopeSelector = null;
this._ownStyleProperties = null;
this._customStyle = null;
},
_needsStyleProperties: function () {
return Boolean(this._ownStylePropertyNames && this._ownStylePropertyNames.length);
},
_beforeAttached: function () {
if (!this._scopeSelector && this._needsStyleProperties()) {
this._updateStyleProperties();
}
},
_findStyleHost: function () {
var e = this, root;
while (root = Polymer.dom(e).getOwnerRoot()) {
if (Polymer.isInstance(root.host)) {
return root.host;
}
e = root.host;
}
return styleDefaults;
},
_updateStyleProperties: function () {
var info, scope = this._findStyleHost();
if (!scope._styleCache) {
scope._styleCache = new Polymer.StyleCache();
}
var scopeData = propertyUtils.propertyDataFromStyles(scope._styles, this);
scopeData.key.customStyle = this.customStyle;
info = scope._styleCache.retrieve(this.is, scopeData.key, this._styles);
var scopeCached = Boolean(info);
if (scopeCached) {
this._styleProperties = info._styleProperties;
} else {
this._computeStyleProperties(scopeData.properties);
}
this._computeOwnStyleProperties();
if (!scopeCached) {
info = styleCache.retrieve(this.is, this._ownStyleProperties, this._styles);
}
var globalCached = Boolean(info) && !scopeCached;
var style = this._applyStyleProperties(info);
if (!scopeCached) {
style = style && nativeShadow ? style.cloneNode(true) : style;
info = {
style: style,
_scopeSelector: this._scopeSelector,
_styleProperties: this._styleProperties
};
scopeData.key.customStyle = {};
this.mixin(scopeData.key.customStyle, this.customStyle);
scope._styleCache.store(this.is, info, scopeData.key, this._styles);
if (!globalCached) {
styleCache.store(this.is, Object.create(info), this._ownStyleProperties, this._styles);
}
}
},
_computeStyleProperties: function (scopeProps) {
var scope = this._findStyleHost();
if (!scope._styleProperties) {
scope._computeStyleProperties();
}
var props = Object.create(scope._styleProperties);
this.mixin(props, propertyUtils.hostPropertiesFromStyles(this._styles));
scopeProps = scopeProps || propertyUtils.propertyDataFromStyles(scope._styles, this).properties;
this.mixin(props, scopeProps);
this.mixin(props, propertyUtils.scopePropertiesFromStyles(this._styles));
propertyUtils.mixinCustomStyle(props, this.customStyle);
propertyUtils.reify(props);
this._styleProperties = props;
},
_computeOwnStyleProperties: function () {
var props = {};
for (var i = 0, n; i < this._ownStylePropertyNames.length; i++) {
n = this._ownStylePropertyNames[i];
props[n] = this._styleProperties[n];
}
this._ownStyleProperties = props;
},
_scopeCount: 0,
_applyStyleProperties: function (info) {
var oldScopeSelector = this._scopeSelector;
this._scopeSelector = info ? info._scopeSelector : this.is + '-' + this.__proto__._scopeCount++;
var style = propertyUtils.applyElementStyle(this, this._styleProperties, this._scopeSelector, info && info.style);
if (!nativeShadow) {
propertyUtils.applyElementScopeSelector(this, this._scopeSelector, oldScopeSelector, this._scopeCssViaAttr);
}
return style;
},
serializeValueToAttribute: function (value, attribute, node) {
node = node || this;
if (attribute === 'class' && !nativeShadow) {
var host = node === this ? this.domHost || this.dataHost : this;
if (host) {
value = host._scopeElementClass(node, value);
}
}
node = this.shadyRoot && this.shadyRoot._hasDistributed ? Polymer.dom(node) : node;
serializeValueToAttribute.call(this, value, attribute, node);
},
_scopeElementClass: function (element, selector) {
if (!nativeShadow && !this._scopeCssViaAttr) {
selector = (selector ? selector + ' ' : '') + SCOPE_NAME + ' ' + this.is + (element._scopeSelector ? ' ' + XSCOPE_NAME + ' ' + element._scopeSelector : '');
}
return selector;
},
updateStyles: function (properties) {
if (this.isAttached) {
if (properties) {
this.mixin(this.customStyle, properties);
}
if (this._needsStyleProperties()) {
this._updateStyleProperties();
} else {
this._styleProperties = null;
}
if (this._styleCache) {
this._styleCache.clear();
}
this._updateRootStyles();
}
},
_updateRootStyles: function (root) {
root = root || this.root;
var c$ = Polymer.dom(root)._query(function (e) {
return e.shadyRoot || e.shadowRoot;
});
for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
if (c.updateStyles) {
c.updateStyles();
}
}
}
});
Polymer.updateStyles = function (properties) {
styleDefaults.updateStyles(properties);
Polymer.Base._updateRootStyles(document);
};
var styleCache = new Polymer.StyleCache();
Polymer.customStyleCache = styleCache;
var SCOPE_NAME = styleTransformer.SCOPE_NAME;
var XSCOPE_NAME = propertyUtils.XSCOPE_NAME;
}());
Polymer.Base._addFeature({
_registerFeatures: function () {
this._prepIs();
this._prepConstructor();
this._prepStyles();
},
_finishRegisterFeatures: function () {
this._prepTemplate();
this._prepShimStyles();
this._prepAnnotations();
this._prepEffects();
this._prepBehaviors();
this._prepPropertyInfo();
this._prepBindings();
this._prepShady();
},
_prepBehavior: function (b) {
this._addPropertyEffects(b.properties);
this._addComplexObserverEffects(b.observers);
this._addHostAttributes(b.hostAttributes);
},
_initFeatures: function () {
this._setupGestures();
this._setupConfigure();
this._setupStyleProperties();
this._setupDebouncers();
this._setupShady();
this._registerHost();
if (this._template) {
this._poolContent();
this._beginHosting();
this._stampTemplate();
this._endHosting();
this._marshalAnnotationReferences();
}
this._marshalInstanceEffects();
this._marshalBehaviors();
this._marshalHostAttributes();
this._marshalAttributes();
this._tryReady();
},
_marshalBehavior: function (b) {
if (b.listeners) {
this._listenListeners(b.listeners);
}
}
});
(function () {
var propertyUtils = Polymer.StyleProperties;
var styleUtil = Polymer.StyleUtil;
var cssParse = Polymer.CssParse;
var styleDefaults = Polymer.StyleDefaults;
var styleTransformer = Polymer.StyleTransformer;
Polymer({
is: 'custom-style',
extends: 'style',
_template: null,
properties: { include: String },
ready: function () {
this._tryApply();
},
attached: function () {
this._tryApply();
},
_tryApply: function () {
if (!this._appliesToDocument) {
if (this.parentNode && this.parentNode.localName !== 'dom-module') {
this._appliesToDocument = true;
var e = this.__appliedElement || this;
styleDefaults.addStyle(e);
if (e.textContent || this.include) {
this._apply(true);
} else {
var self = this;
var observer = new MutationObserver(function () {
observer.disconnect();
self._apply(true);
});
observer.observe(e, { childList: true });
}
}
}
},
_apply: function (deferProperties) {
var e = this.__appliedElement || this;
if (this.include) {
e.textContent = styleUtil.cssFromModules(this.include, true) + e.textContent;
}
if (e.textContent) {
styleUtil.forEachRule(styleUtil.rulesForStyle(e), function (rule) {
styleTransformer.documentRule(rule);
});
var self = this;
var fn = function fn() {
self._applyCustomProperties(e);
};
if (this._pendingApplyProperties) {
cancelAnimationFrame(this._pendingApplyProperties);
this._pendingApplyProperties = null;
}
if (deferProperties) {
this._pendingApplyProperties = requestAnimationFrame(fn);
} else {
fn();
}
}
},
_applyCustomProperties: function (element) {
this._computeStyleProperties();
var props = this._styleProperties;
var rules = styleUtil.rulesForStyle(element);
element.textContent = styleUtil.toCssText(rules, function (rule) {
var css = rule.cssText = rule.parsedCssText;
if (rule.propertyInfo && rule.propertyInfo.cssText) {
css = cssParse.removeCustomPropAssignment(css);
rule.cssText = propertyUtils.valueForProperties(css, props);
}
});
}
});
}());
Polymer.Templatizer = {
properties: { __hideTemplateChildren__: { observer: '_showHideChildren' } },
_instanceProps: Polymer.nob,
_parentPropPrefix: '_parent_',
templatize: function (template) {
this._templatized = template;
if (!template._content) {
template._content = template.content;
}
if (template._content._ctor) {
this.ctor = template._content._ctor;
this._prepParentProperties(this.ctor.prototype, template);
return;
}
var archetype = Object.create(Polymer.Base);
this._customPrepAnnotations(archetype, template);
this._prepParentProperties(archetype, template);
archetype._prepEffects();
this._customPrepEffects(archetype);
archetype._prepBehaviors();
archetype._prepPropertyInfo();
archetype._prepBindings();
archetype._notifyPathUp = this._notifyPathUpImpl;
archetype._scopeElementClass = this._scopeElementClassImpl;
archetype.listen = this._listenImpl;
archetype._showHideChildren = this._showHideChildrenImpl;
archetype.__setPropertyOrig = this.__setProperty;
archetype.__setProperty = this.__setPropertyImpl;
var _constructor = this._constructorImpl;
var ctor = function TemplateInstance(model, host) {
_constructor.call(this, model, host);
};
ctor.prototype = archetype;
archetype.constructor = ctor;
template._content._ctor = ctor;
this.ctor = ctor;
},
_getRootDataHost: function () {
return this.dataHost && this.dataHost._rootDataHost || this.dataHost;
},
_showHideChildrenImpl: function (hide) {
var c = this._children;
for (var i = 0; i < c.length; i++) {
var n = c[i];
if (Boolean(hide) != Boolean(n.__hideTemplateChildren__)) {
if (n.nodeType === Node.TEXT_NODE) {
if (hide) {
n.__polymerTextContent__ = n.textContent;
n.textContent = '';
} else {
n.textContent = n.__polymerTextContent__;
}
} else if (n.style) {
if (hide) {
n.__polymerDisplay__ = n.style.display;
n.style.display = 'none';
} else {
n.style.display = n.__polymerDisplay__;
}
}
}
n.__hideTemplateChildren__ = hide;
}
},
__setPropertyImpl: function (property, value, fromAbove, node) {
if (node && node.__hideTemplateChildren__ && property == 'textContent') {
property = '__polymerTextContent__';
}
this.__setPropertyOrig(property, value, fromAbove, node);
},
_debounceTemplate: function (fn) {
Polymer.dom.addDebouncer(this.debounce('_debounceTemplate', fn));
},
_flushTemplates: function () {
Polymer.dom.flush();
},
_customPrepEffects: function (archetype) {
var parentProps = archetype._parentProps;
for (var prop in parentProps) {
archetype._addPropertyEffect(prop, 'function', this._createHostPropEffector(prop));
}
for (prop in this._instanceProps) {
archetype._addPropertyEffect(prop, 'function', this._createInstancePropEffector(prop));
}
},
_customPrepAnnotations: function (archetype, template) {
archetype._template = template;
var c = template._content;
if (!c._notes) {
var rootDataHost = archetype._rootDataHost;
if (rootDataHost) {
Polymer.Annotations.prepElement = function () {
rootDataHost._prepElement();
};
}
c._notes = Polymer.Annotations.parseAnnotations(template);
Polymer.Annotations.prepElement = null;
this._processAnnotations(c._notes);
}
archetype._notes = c._notes;
archetype._parentProps = c._parentProps;
},
_prepParentProperties: function (archetype, template) {
var parentProps = this._parentProps = archetype._parentProps;
if (this._forwardParentProp && parentProps) {
var proto = archetype._parentPropProto;
var prop;
if (!proto) {
for (prop in this._instanceProps) {
delete parentProps[prop];
}
proto = archetype._parentPropProto = Object.create(null);
if (template != this) {
Polymer.Bind.prepareModel(proto);
Polymer.Base.prepareModelNotifyPath(proto);
}
for (prop in parentProps) {
var parentProp = this._parentPropPrefix + prop;
var effects = [
{
kind: 'function',
effect: this._createForwardPropEffector(prop),
fn: Polymer.Bind._functionEffect
},
{
kind: 'notify',
fn: Polymer.Bind._notifyEffect,
effect: { event: Polymer.CaseMap.camelToDashCase(parentProp) + '-changed' }
}
];
Polymer.Bind._createAccessors(proto, parentProp, effects);
}
}
var self = this;
if (template != this) {
Polymer.Bind.prepareInstance(template);
template._forwardParentProp = function (source, value) {
self._forwardParentProp(source, value);
};
}
this._extendTemplate(template, proto);
template._pathEffector = function (path, value, fromAbove) {
return self._pathEffectorImpl(path, value, fromAbove);
};
}
},
_createForwardPropEffector: function (prop) {
return function (source, value) {
this._forwardParentProp(prop, value);
};
},
_createHostPropEffector: function (prop) {
var prefix = this._parentPropPrefix;
return function (source, value) {
this.dataHost._templatized[prefix + prop] = value;
};
},
_createInstancePropEffector: function (prop) {
return function (source, value, old, fromAbove) {
if (!fromAbove) {
this.dataHost._forwardInstanceProp(this, prop, value);
}
};
},
_extendTemplate: function (template, proto) {
var n$ = Object.getOwnPropertyNames(proto);
if (proto._propertySetter) {
template._propertySetter = proto._propertySetter;
}
for (var i = 0, n; i < n$.length && (n = n$[i]); i++) {
var val = template[n];
var pd = Object.getOwnPropertyDescriptor(proto, n);
Object.defineProperty(template, n, pd);
if (val !== undefined) {
template._propertySetter(n, val);
}
}
},
_showHideChildren: function (hidden) {
},
_forwardInstancePath: function (inst, path, value) {
},
_forwardInstanceProp: function (inst, prop, value) {
},
_notifyPathUpImpl: function (path, value) {
var dataHost = this.dataHost;
var dot = path.indexOf('.');
var root = dot < 0 ? path : path.slice(0, dot);
dataHost._forwardInstancePath.call(dataHost, this, path, value);
if (root in dataHost._parentProps) {
dataHost._templatized.notifyPath(dataHost._parentPropPrefix + path, value);
}
},
_pathEffectorImpl: function (path, value, fromAbove) {
if (this._forwardParentPath) {
if (path.indexOf(this._parentPropPrefix) === 0) {
var subPath = path.substring(this._parentPropPrefix.length);
var model = this._modelForPath(subPath);
if (model in this._parentProps) {
this._forwardParentPath(subPath, value);
}
}
}
Polymer.Base._pathEffector.call(this._templatized, path, value, fromAbove);
},
_constructorImpl: function (model, host) {
this._rootDataHost = host._getRootDataHost();
this._setupConfigure(model);
this._registerHost(host);
this._beginHosting();
this.root = this.instanceTemplate(this._template);
this.root.__noContent = !this._notes._hasContent;
this.root.__styleScoped = true;
this._endHosting();
this._marshalAnnotatedNodes();
this._marshalInstanceEffects();
this._marshalAnnotatedListeners();
var children = [];
for (var n = this.root.firstChild; n; n = n.nextSibling) {
children.push(n);
n._templateInstance = this;
}
this._children = children;
if (host.__hideTemplateChildren__) {
this._showHideChildren(true);
}
this._tryReady();
},
_listenImpl: function (node, eventName, methodName) {
var model = this;
var host = this._rootDataHost;
var handler = host._createEventHandler(node, eventName, methodName);
var decorated = function (e) {
e.model = model;
handler(e);
};
host._listen(node, eventName, decorated);
},
_scopeElementClassImpl: function (node, value) {
var host = this._rootDataHost;
if (host) {
return host._scopeElementClass(node, value);
}
},
stamp: function (model) {
model = model || {};
if (this._parentProps) {
var templatized = this._templatized;
for (var prop in this._parentProps) {
if (model[prop] === undefined) {
model[prop] = templatized[this._parentPropPrefix + prop];
}
}
}
return new this.ctor(model, this);
},
modelForElement: function (el) {
var model;
while (el) {
if (model = el._templateInstance) {
if (model.dataHost != this) {
el = model.dataHost;
} else {
return model;
}
} else {
el = el.parentNode;
}
}
}
};
Polymer({
is: 'dom-template',
extends: 'template',
_template: null,
behaviors: [Polymer.Templatizer],
ready: function () {
this.templatize(this);
}
});
Polymer._collections = new WeakMap();
Polymer.Collection = function (userArray) {
Polymer._collections.set(userArray, this);
this.userArray = userArray;
this.store = userArray.slice();
this.initMap();
};
Polymer.Collection.prototype = {
constructor: Polymer.Collection,
initMap: function () {
var omap = this.omap = new WeakMap();
var pmap = this.pmap = {};
var s = this.store;
for (var i = 0; i < s.length; i++) {
var item = s[i];
if (item && typeof item == 'object') {
omap.set(item, i);
} else {
pmap[item] = i;
}
}
},
add: function (item) {
var key = this.store.push(item) - 1;
if (item && typeof item == 'object') {
this.omap.set(item, key);
} else {
this.pmap[item] = key;
}
return '#' + key;
},
removeKey: function (key) {
if (key = this._parseKey(key)) {
this._removeFromMap(this.store[key]);
delete this.store[key];
}
},
_removeFromMap: function (item) {
if (item && typeof item == 'object') {
this.omap.delete(item);
} else {
delete this.pmap[item];
}
},
remove: function (item) {
var key = this.getKey(item);
this.removeKey(key);
return key;
},
getKey: function (item) {
var key;
if (item && typeof item == 'object') {
key = this.omap.get(item);
} else {
key = this.pmap[item];
}
if (key != undefined) {
return '#' + key;
}
},
getKeys: function () {
return Object.keys(this.store).map(function (key) {
return '#' + key;
});
},
_parseKey: function (key) {
if (key && key[0] == '#') {
return key.slice(1);
}
},
setItem: function (key, item) {
if (key = this._parseKey(key)) {
var old = this.store[key];
if (old) {
this._removeFromMap(old);
}
if (item && typeof item == 'object') {
this.omap.set(item, key);
} else {
this.pmap[item] = key;
}
this.store[key] = item;
}
},
getItem: function (key) {
if (key = this._parseKey(key)) {
return this.store[key];
}
},
getItems: function () {
var items = [], store = this.store;
for (var key in store) {
items.push(store[key]);
}
return items;
},
_applySplices: function (splices) {
var keyMap = {}, key;
for (var i = 0, s; i < splices.length && (s = splices[i]); i++) {
s.addedKeys = [];
for (var j = 0; j < s.removed.length; j++) {
key = this.getKey(s.removed[j]);
keyMap[key] = keyMap[key] ? null : -1;
}
for (j = 0; j < s.addedCount; j++) {
var item = this.userArray[s.index + j];
key = this.getKey(item);
key = key === undefined ? this.add(item) : key;
keyMap[key] = keyMap[key] ? null : 1;
s.addedKeys.push(key);
}
}
var removed = [];
var added = [];
for (key in keyMap) {
if (keyMap[key] < 0) {
this.removeKey(key);
removed.push(key);
}
if (keyMap[key] > 0) {
added.push(key);
}
}
return [{
removed: removed,
added: added
}];
}
};
Polymer.Collection.get = function (userArray) {
return Polymer._collections.get(userArray) || new Polymer.Collection(userArray);
};
Polymer.Collection.applySplices = function (userArray, splices) {
var coll = Polymer._collections.get(userArray);
return coll ? coll._applySplices(splices) : null;
};
Polymer({
is: 'dom-repeat',
extends: 'template',
_template: null,
properties: {
items: { type: Array },
as: {
type: String,
value: 'item'
},
indexAs: {
type: String,
value: 'index'
},
sort: {
type: Function,
observer: '_sortChanged'
},
filter: {
type: Function,
observer: '_filterChanged'
},
observe: {
type: String,
observer: '_observeChanged'
},
delay: Number,
renderedItemCount: {
type: Number,
notify: true,
readOnly: true
},
initialCount: {
type: Number,
observer: '_initializeChunking'
},
targetFramerate: {
type: Number,
value: 20
},
_targetFrameTime: {
type: Number,
computed: '_computeFrameTime(targetFramerate)'
}
},
behaviors: [Polymer.Templatizer],
observers: ['_itemsChanged(items.*)'],
created: function () {
this._instances = [];
this._pool = [];
this._limit = Infinity;
var self = this;
this._boundRenderChunk = function () {
self._renderChunk();
};
},
detached: function () {
this.__isDetached = true;
for (var i = 0; i < this._instances.length; i++) {
this._detachInstance(i);
}
},
attached: function () {
if (this.__isDetached) {
this.__isDetached = false;
var parent = Polymer.dom(Polymer.dom(this).parentNode);
for (var i = 0; i < this._instances.length; i++) {
this._attachInstance(i, parent);
}
}
},
ready: function () {
this._instanceProps = { __key__: true };
this._instanceProps[this.as] = true;
this._instanceProps[this.indexAs] = true;
if (!this.ctor) {
this.templatize(this);
}
},
_sortChanged: function (sort) {
var dataHost = this._getRootDataHost();
this._sortFn = sort && (typeof sort == 'function' ? sort : function () {
return dataHost[sort].apply(dataHost, arguments);
});
this._needFullRefresh = true;
if (this.items) {
this._debounceTemplate(this._render);
}
},
_filterChanged: function (filter) {
var dataHost = this._getRootDataHost();
this._filterFn = filter && (typeof filter == 'function' ? filter : function () {
return dataHost[filter].apply(dataHost, arguments);
});
this._needFullRefresh = true;
if (this.items) {
this._debounceTemplate(this._render);
}
},
_computeFrameTime: function (rate) {
return Math.ceil(1000 / rate);
},
_initializeChunking: function () {
if (this.initialCount) {
this._limit = this.initialCount;
this._chunkCount = this.initialCount;
this._lastChunkTime = performance.now();
}
},
_tryRenderChunk: function () {
if (this.items && this._limit < this.items.length) {
this.debounce('renderChunk', this._requestRenderChunk);
}
},
_requestRenderChunk: function () {
requestAnimationFrame(this._boundRenderChunk);
},
_renderChunk: function () {
var currChunkTime = performance.now();
var ratio = this._targetFrameTime / (currChunkTime - this._lastChunkTime);
this._chunkCount = Math.round(this._chunkCount * ratio) || 1;
this._limit += this._chunkCount;
this._lastChunkTime = currChunkTime;
this._debounceTemplate(this._render);
},
_observeChanged: function () {
this._observePaths = this.observe && this.observe.replace('.*', '.').split(' ');
},
_itemsChanged: function (change) {
if (change.path == 'items') {
if (Array.isArray(this.items)) {
this.collection = Polymer.Collection.get(this.items);
} else if (!this.items) {
this.collection = null;
} else {
this._error(this._logf('dom-repeat', 'expected array for `items`,' + ' found', this.items));
}
this._keySplices = [];
this._indexSplices = [];
this._needFullRefresh = true;
this._initializeChunking();
this._debounceTemplate(this._render);
} else if (change.path == 'items.splices') {
this._keySplices = this._keySplices.concat(change.value.keySplices);
this._indexSplices = this._indexSplices.concat(change.value.indexSplices);
this._debounceTemplate(this._render);
} else {
var subpath = change.path.slice(6);
this._forwardItemPath(subpath, change.value);
this._checkObservedPaths(subpath);
}
},
_checkObservedPaths: function (path) {
if (this._observePaths) {
path = path.substring(path.indexOf('.') + 1);
var paths = this._observePaths;
for (var i = 0; i < paths.length; i++) {
if (path.indexOf(paths[i]) === 0) {
this._needFullRefresh = true;
if (this.delay) {
this.debounce('render', this._render, this.delay);
} else {
this._debounceTemplate(this._render);
}
return;
}
}
}
},
render: function () {
this._needFullRefresh = true;
this._debounceTemplate(this._render);
this._flushTemplates();
},
_render: function () {
if (this._needFullRefresh) {
this._applyFullRefresh();
this._needFullRefresh = false;
} else if (this._keySplices.length) {
if (this._sortFn) {
this._applySplicesUserSort(this._keySplices);
} else {
if (this._filterFn) {
this._applyFullRefresh();
} else {
this._applySplicesArrayOrder(this._indexSplices);
}
}
} else {
}
this._keySplices = [];
this._indexSplices = [];
var keyToIdx = this._keyToInstIdx = {};
for (var i = this._instances.length - 1; i >= 0; i--) {
var inst = this._instances[i];
if (inst.isPlaceholder && i < this._limit) {
inst = this._insertInstance(i, inst.__key__);
} else if (!inst.isPlaceholder && i >= this._limit) {
inst = this._downgradeInstance(i, inst.__key__);
}
keyToIdx[inst.__key__] = i;
if (!inst.isPlaceholder) {
inst.__setProperty(this.indexAs, i, true);
}
}
this._pool.length = 0;
this._setRenderedItemCount(this._instances.length);
this.fire('dom-change');
this._tryRenderChunk();
},
_applyFullRefresh: function () {
var c = this.collection;
var keys;
if (this._sortFn) {
keys = c ? c.getKeys() : [];
} else {
keys = [];
var items = this.items;
if (items) {
for (var i = 0; i < items.length; i++) {
keys.push(c.getKey(items[i]));
}
}
}
var self = this;
if (this._filterFn) {
keys = keys.filter(function (a) {
return self._filterFn(c.getItem(a));
});
}
if (this._sortFn) {
keys.sort(function (a, b) {
return self._sortFn(c.getItem(a), c.getItem(b));
});
}
for (i = 0; i < keys.length; i++) {
var key = keys[i];
var inst = this._instances[i];
if (inst) {
inst.__key__ = key;
if (!inst.isPlaceholder && i < this._limit) {
inst.__setProperty(this.as, c.getItem(key), true);
}
} else if (i < this._limit) {
this._insertInstance(i, key);
} else {
this._insertPlaceholder(i, key);
}
}
for (var j = this._instances.length - 1; j >= i; j--) {
this._detachAndRemoveInstance(j);
}
},
_numericSort: function (a, b) {
return a - b;
},
_applySplicesUserSort: function (splices) {
var c = this.collection;
var keyMap = {};
var key;
for (var i = 0, s; i < splices.length && (s = splices[i]); i++) {
for (var j = 0; j < s.removed.length; j++) {
key = s.removed[j];
keyMap[key] = keyMap[key] ? null : -1;
}
for (j = 0; j < s.added.length; j++) {
key = s.added[j];
keyMap[key] = keyMap[key] ? null : 1;
}
}
var removedIdxs = [];
var addedKeys = [];
for (key in keyMap) {
if (keyMap[key] === -1) {
removedIdxs.push(this._keyToInstIdx[key]);
}
if (keyMap[key] === 1) {
addedKeys.push(key);
}
}
if (removedIdxs.length) {
removedIdxs.sort(this._numericSort);
for (i = removedIdxs.length - 1; i >= 0; i--) {
var idx = removedIdxs[i];
if (idx !== undefined) {
this._detachAndRemoveInstance(idx);
}
}
}
var self = this;
if (addedKeys.length) {
if (this._filterFn) {
addedKeys = addedKeys.filter(function (a) {
return self._filterFn(c.getItem(a));
});
}
addedKeys.sort(function (a, b) {
return self._sortFn(c.getItem(a), c.getItem(b));
});
var start = 0;
for (i = 0; i < addedKeys.length; i++) {
start = this._insertRowUserSort(start, addedKeys[i]);
}
}
},
_insertRowUserSort: function (start, key) {
var c = this.collection;
var item = c.getItem(key);
var end = this._instances.length - 1;
var idx = -1;
while (start <= end) {
var mid = start + end >> 1;
var midKey = this._instances[mid].__key__;
var cmp = this._sortFn(c.getItem(midKey), item);
if (cmp < 0) {
start = mid + 1;
} else if (cmp > 0) {
end = mid - 1;
} else {
idx = mid;
break;
}
}
if (idx < 0) {
idx = end + 1;
}
this._insertPlaceholder(idx, key);
return idx;
},
_applySplicesArrayOrder: function (splices) {
for (var i = 0, s; i < splices.length && (s = splices[i]); i++) {
for (var j = 0; j < s.removed.length; j++) {
this._detachAndRemoveInstance(s.index);
}
for (j = 0; j < s.addedKeys.length; j++) {
this._insertPlaceholder(s.index + j, s.addedKeys[j]);
}
}
},
_detachInstance: function (idx) {
var inst = this._instances[idx];
if (!inst.isPlaceholder) {
for (var i = 0; i < inst._children.length; i++) {
var el = inst._children[i];
Polymer.dom(inst.root).appendChild(el);
}
return inst;
}
},
_attachInstance: function (idx, parent) {
var inst = this._instances[idx];
if (!inst.isPlaceholder) {
parent.insertBefore(inst.root, this);
}
},
_detachAndRemoveInstance: function (idx) {
var inst = this._detachInstance(idx);
if (inst) {
this._pool.push(inst);
}
this._instances.splice(idx, 1);
},
_insertPlaceholder: function (idx, key) {
this._instances.splice(idx, 0, {
isPlaceholder: true,
__key__: key
});
},
_stampInstance: function (idx, key) {
var model = { __key__: key };
model[this.as] = this.collection.getItem(key);
model[this.indexAs] = idx;
return this.stamp(model);
},
_insertInstance: function (idx, key) {
var inst = this._pool.pop();
if (inst) {
inst.__setProperty(this.as, this.collection.getItem(key), true);
inst.__setProperty('__key__', key, true);
} else {
inst = this._stampInstance(idx, key);
}
var beforeRow = this._instances[idx + 1];
var beforeNode = beforeRow && !beforeRow.isPlaceholder ? beforeRow._children[0] : this;
var parentNode = Polymer.dom(this).parentNode;
Polymer.dom(parentNode).insertBefore(inst.root, beforeNode);
this._instances[idx] = inst;
return inst;
},
_downgradeInstance: function (idx, key) {
var inst = this._detachInstance(idx);
if (inst) {
this._pool.push(inst);
}
inst = {
isPlaceholder: true,
__key__: key
};
this._instances[idx] = inst;
return inst;
},
_showHideChildren: function (hidden) {
for (var i = 0; i < this._instances.length; i++) {
this._instances[i]._showHideChildren(hidden);
}
},
_forwardInstanceProp: function (inst, prop, value) {
if (prop == this.as) {
var idx;
if (this._sortFn || this._filterFn) {
idx = this.items.indexOf(this.collection.getItem(inst.__key__));
} else {
idx = inst[this.indexAs];
}
this.set('items.' + idx, value);
}
},
_forwardInstancePath: function (inst, path, value) {
if (path.indexOf(this.as + '.') === 0) {
this._notifyPath('items.' + inst.__key__ + '.' + path.slice(this.as.length + 1), value);
}
},
_forwardParentProp: function (prop, value) {
var i$ = this._instances;
for (var i = 0, inst; i < i$.length && (inst = i$[i]); i++) {
if (!inst.isPlaceholder) {
inst.__setProperty(prop, value, true);
}
}
},
_forwardParentPath: function (path, value) {
var i$ = this._instances;
for (var i = 0, inst; i < i$.length && (inst = i$[i]); i++) {
if (!inst.isPlaceholder) {
inst._notifyPath(path, value, true);
}
}
},
_forwardItemPath: function (path, value) {
if (this._keyToInstIdx) {
var dot = path.indexOf('.');
var key = path.substring(0, dot < 0 ? path.length : dot);
var idx = this._keyToInstIdx[key];
var inst = this._instances[idx];
if (inst && !inst.isPlaceholder) {
if (dot >= 0) {
path = this.as + '.' + path.substring(dot + 1);
inst._notifyPath(path, value, true);
} else {
inst.__setProperty(this.as, value, true);
}
}
}
},
itemForElement: function (el) {
var instance = this.modelForElement(el);
return instance && instance[this.as];
},
keyForElement: function (el) {
var instance = this.modelForElement(el);
return instance && instance.__key__;
},
indexForElement: function (el) {
var instance = this.modelForElement(el);
return instance && instance[this.indexAs];
}
});
Polymer({
is: 'array-selector',
_template: null,
properties: {
items: {
type: Array,
observer: 'clearSelection'
},
multi: {
type: Boolean,
value: false,
observer: 'clearSelection'
},
selected: {
type: Object,
notify: true
},
selectedItem: {
type: Object,
notify: true
},
toggle: {
type: Boolean,
value: false
}
},
clearSelection: function () {
if (Array.isArray(this.selected)) {
for (var i = 0; i < this.selected.length; i++) {
this.unlinkPaths('selected.' + i);
}
} else {
this.unlinkPaths('selected');
this.unlinkPaths('selectedItem');
}
if (this.multi) {
if (!this.selected || this.selected.length) {
this.selected = [];
this._selectedColl = Polymer.Collection.get(this.selected);
}
} else {
this.selected = null;
this._selectedColl = null;
}
this.selectedItem = null;
},
isSelected: function (item) {
if (this.multi) {
return this._selectedColl.getKey(item) !== undefined;
} else {
return this.selected == item;
}
},
deselect: function (item) {
if (this.multi) {
if (this.isSelected(item)) {
var skey = this._selectedColl.getKey(item);
this.arrayDelete('selected', item);
this.unlinkPaths('selected.' + skey);
}
} else {
this.selected = null;
this.selectedItem = null;
this.unlinkPaths('selected');
this.unlinkPaths('selectedItem');
}
},
select: function (item) {
var icol = Polymer.Collection.get(this.items);
var key = icol.getKey(item);
if (this.multi) {
if (this.isSelected(item)) {
if (this.toggle) {
this.deselect(item);
}
} else {
this.push('selected', item);
var skey = this._selectedColl.getKey(item);
this.linkPaths('selected.' + skey, 'items.' + key);
}
} else {
if (this.toggle && item == this.selected) {
this.deselect();
} else {
this.selected = item;
this.selectedItem = item;
this.linkPaths('selected', 'items.' + key);
this.linkPaths('selectedItem', 'items.' + key);
}
}
}
});
Polymer({
is: 'dom-if',
extends: 'template',
_template: null,
properties: {
'if': {
type: Boolean,
value: false,
observer: '_queueRender'
},
restamp: {
type: Boolean,
value: false,
observer: '_queueRender'
}
},
behaviors: [Polymer.Templatizer],
_queueRender: function () {
this._debounceTemplate(this._render);
},
detached: function () {
if (!this.parentNode || this.parentNode.nodeType == Node.DOCUMENT_FRAGMENT_NODE && (!Polymer.Settings.hasShadow || !(this.parentNode instanceof ShadowRoot))) {
this._teardownInstance();
}
},
attached: function () {
if (this.if && this.ctor) {
this.async(this._ensureInstance);
}
},
render: function () {
this._flushTemplates();
},
_render: function () {
if (this.if) {
if (!this.ctor) {
this.templatize(this);
}
this._ensureInstance();
this._showHideChildren();
} else if (this.restamp) {
this._teardownInstance();
}
if (!this.restamp && this._instance) {
this._showHideChildren();
}
if (this.if != this._lastIf) {
this.fire('dom-change');
this._lastIf = this.if;
}
},
_ensureInstance: function () {
var parentNode = Polymer.dom(this).parentNode;
if (parentNode) {
var parent = Polymer.dom(parentNode);
if (!this._instance) {
this._instance = this.stamp();
var root = this._instance.root;
parent.insertBefore(root, this);
} else {
var c$ = this._instance._children;
if (c$ && c$.length) {
var lastChild = Polymer.dom(this).previousSibling;
if (lastChild !== c$[c$.length - 1]) {
for (var i = 0, n; i < c$.length && (n = c$[i]); i++) {
parent.insertBefore(n, this);
}
}
}
}
}
},
_teardownInstance: function () {
if (this._instance) {
var c$ = this._instance._children;
if (c$ && c$.length) {
var parent = Polymer.dom(Polymer.dom(c$[0]).parentNode);
for (var i = 0, n; i < c$.length && (n = c$[i]); i++) {
parent.removeChild(n);
}
}
this._instance = null;
}
},
_showHideChildren: function () {
var hidden = this.__hideTemplateChildren__ || !this.if;
if (this._instance) {
this._instance._showHideChildren(hidden);
}
},
_forwardParentProp: function (prop, value) {
if (this._instance) {
this._instance[prop] = value;
}
},
_forwardParentPath: function (path, value) {
if (this._instance) {
this._instance._notifyPath(path, value, true);
}
}
});
Polymer({
is: 'dom-bind',
extends: 'template',
_template: null,
created: function () {
var self = this;
Polymer.RenderStatus.whenReady(function () {
if (document.readyState == 'loading') {
document.addEventListener('DOMContentLoaded', function () {
self._markImportsReady();
});
} else {
self._markImportsReady();
}
});
},
_ensureReady: function () {
if (!this._readied) {
this._readySelf();
}
},
_markImportsReady: function () {
this._importsReady = true;
this._ensureReady();
},
_registerFeatures: function () {
this._prepConstructor();
},
_insertChildren: function () {
var parentDom = Polymer.dom(Polymer.dom(this).parentNode);
parentDom.insertBefore(this.root, this);
},
_removeChildren: function () {
if (this._children) {
for (var i = 0; i < this._children.length; i++) {
this.root.appendChild(this._children[i]);
}
}
},
_initFeatures: function () {
},
_scopeElementClass: function (element, selector) {
if (this.dataHost) {
return this.dataHost._scopeElementClass(element, selector);
} else {
return selector;
}
},
_prepConfigure: function () {
var config = {};
for (var prop in this._propertyEffects) {
config[prop] = this[prop];
}
var setupConfigure = this._setupConfigure;
this._setupConfigure = function () {
setupConfigure.call(this, config);
};
},
attached: function () {
if (this._importsReady) {
this.render();
}
},
detached: function () {
this._removeChildren();
},
render: function () {
this._ensureReady();
if (!this._children) {
this._template = this;
this._prepAnnotations();
this._prepEffects();
this._prepBehaviors();
this._prepConfigure();
this._prepBindings();
this._prepPropertyInfo();
Polymer.Base._initFeatures.call(this);
this._children = Polymer.TreeApi.arrayCopyChildNodes(this.root);
}
this._insertChildren();
this.fire('dom-change');
}
});
(function () {
var metaDatas = {};
var metaArrays = {};
var singleton = null;
Polymer.IronMeta = Polymer({
is: 'iron-meta',
properties: {
type: {
type: String,
value: 'default',
observer: '_typeChanged'
},
key: {
type: String,
observer: '_keyChanged'
},
value: {
type: Object,
notify: true,
observer: '_valueChanged'
},
self: {
type: Boolean,
observer: '_selfChanged'
},
list: {
type: Array,
notify: true
}
},
hostAttributes: { hidden: true },
factoryImpl: function (config) {
if (config) {
for (var n in config) {
switch (n) {
case 'type':
case 'key':
case 'value':
this[n] = config[n];
break;
}
}
}
},
created: function () {
this._metaDatas = metaDatas;
this._metaArrays = metaArrays;
},
_keyChanged: function (key, old) {
this._resetRegistration(old);
},
_valueChanged: function (value) {
this._resetRegistration(this.key);
},
_selfChanged: function (self) {
if (self) {
this.value = this;
}
},
_typeChanged: function (type) {
this._unregisterKey(this.key);
if (!metaDatas[type]) {
metaDatas[type] = {};
}
this._metaData = metaDatas[type];
if (!metaArrays[type]) {
metaArrays[type] = [];
}
this.list = metaArrays[type];
this._registerKeyValue(this.key, this.value);
},
byKey: function (key) {
return this._metaData && this._metaData[key];
},
_resetRegistration: function (oldKey) {
this._unregisterKey(oldKey);
this._registerKeyValue(this.key, this.value);
},
_unregisterKey: function (key) {
this._unregister(key, this._metaData, this.list);
},
_registerKeyValue: function (key, value) {
this._register(key, value, this._metaData, this.list);
},
_register: function (key, value, data, list) {
if (key && data && value !== undefined) {
data[key] = value;
list.push(value);
}
},
_unregister: function (key, data, list) {
if (key && data) {
if (key in data) {
var value = data[key];
delete data[key];
this.arrayDelete(list, value);
}
}
}
});
Polymer.IronMeta.getIronMeta = function getIronMeta() {
if (singleton === null) {
singleton = new Polymer.IronMeta();
}
return singleton;
};
Polymer.IronMetaQuery = Polymer({
is: 'iron-meta-query',
properties: {
type: {
type: String,
value: 'default',
observer: '_typeChanged'
},
key: {
type: String,
observer: '_keyChanged'
},
value: {
type: Object,
notify: true,
readOnly: true
},
list: {
type: Array,
notify: true
}
},
factoryImpl: function (config) {
if (config) {
for (var n in config) {
switch (n) {
case 'type':
case 'key':
this[n] = config[n];
break;
}
}
}
},
created: function () {
this._metaDatas = metaDatas;
this._metaArrays = metaArrays;
},
_keyChanged: function (key) {
this._setValue(this._metaData && this._metaData[key]);
},
_typeChanged: function (type) {
this._metaData = metaDatas[type];
this.list = metaArrays[type];
if (this.key) {
this._keyChanged(this.key);
}
},
byKey: function (key) {
return this._metaData && this._metaData[key];
}
});
}());
Polymer({
is: 'iron-icon',
properties: {
icon: {
type: String,
observer: '_iconChanged'
},
theme: {
type: String,
observer: '_updateIcon'
},
src: {
type: String,
observer: '_srcChanged'
},
_meta: {
value: Polymer.Base.create('iron-meta', { type: 'iconset' }),
observer: '_updateIcon'
}
},
_DEFAULT_ICONSET: 'icons',
_iconChanged: function (icon) {
var parts = (icon || '').split(':');
this._iconName = parts.pop();
this._iconsetName = parts.pop() || this._DEFAULT_ICONSET;
this._updateIcon();
},
_srcChanged: function (src) {
this._updateIcon();
},
_usesIconset: function () {
return this.icon || !this.src;
},
_updateIcon: function () {
if (this._usesIconset()) {
if (this._img && this._img.parentNode) {
Polymer.dom(this.root).removeChild(this._img);
}
if (this._iconName === '') {
if (this._iconset) {
this._iconset.removeIcon(this);
}
} else if (this._iconsetName && this._meta) {
this._iconset = this._meta.byKey(this._iconsetName);
if (this._iconset) {
this._iconset.applyIcon(this, this._iconName, this.theme);
this.unlisten(window, 'iron-iconset-added', '_updateIcon');
} else {
this.listen(window, 'iron-iconset-added', '_updateIcon');
}
}
} else {
if (this._iconset) {
this._iconset.removeIcon(this);
}
if (!this._img) {
this._img = document.createElement('img');
this._img.style.width = '100%';
this._img.style.height = '100%';
this._img.draggable = false;
}
this._img.src = this.src;
Polymer.dom(this.root).appendChild(this._img);
}
}
});
Polymer({
is: 'iron-iconset-svg',
properties: {
name: {
type: String,
observer: '_nameChanged'
},
size: {
type: Number,
value: 24
}
},
attached: function () {
this.style.display = 'none';
},
getIconNames: function () {
this._icons = this._createIconMap();
return Object.keys(this._icons).map(function (n) {
return this.name + ':' + n;
}, this);
},
applyIcon: function (element, iconName) {
element = element.root || element;
this.removeIcon(element);
var svg = this._cloneIcon(iconName);
if (svg) {
var pde = Polymer.dom(element);
pde.insertBefore(svg, pde.childNodes[0]);
return element._svgIcon = svg;
}
return null;
},
removeIcon: function (element) {
if (element._svgIcon) {
Polymer.dom(element).removeChild(element._svgIcon);
element._svgIcon = null;
}
},
_nameChanged: function () {
new Polymer.IronMeta({
type: 'iconset',
key: this.name,
value: this
});
this.async(function () {
this.fire('iron-iconset-added', this, { node: window });
});
},
_createIconMap: function () {
var icons = Object.create(null);
Polymer.dom(this).querySelectorAll('[id]').forEach(function (icon) {
icons[icon.id] = icon;
});
return icons;
},
_cloneIcon: function (id) {
this._icons = this._icons || this._createIconMap();
return this._prepareSvgClone(this._icons[id], this.size);
},
_prepareSvgClone: function (sourceSvg, size) {
if (sourceSvg) {
var content = sourceSvg.cloneNode(true), svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'), viewBox = content.getAttribute('viewBox') || '0 0 ' + size + ' ' + size;
svg.setAttribute('viewBox', viewBox);
svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
svg.style.cssText = 'pointer-events: none; display: block; width: 100%; height: 100%;';
svg.appendChild(content).removeAttribute('id');
return svg;
}
return null;
}
});
function MakePromise(asap) {
function Promise(fn) {
if (typeof this !== 'object' || typeof fn !== 'function')
throw new TypeError();
this._state = null;
this._value = null;
this._deferreds = [];
doResolve(fn, resolve.bind(this), reject.bind(this));
}
function handle(deferred) {
var me = this;
if (this._state === null) {
this._deferreds.push(deferred);
return;
}
asap(function () {
var cb = me._state ? deferred.onFulfilled : deferred.onRejected;
if (typeof cb !== 'function') {
(me._state ? deferred.resolve : deferred.reject)(me._value);
return;
}
var ret;
try {
ret = cb(me._value);
} catch (e) {
deferred.reject(e);
return;
}
deferred.resolve(ret);
});
}
function resolve(newValue) {
try {
if (newValue === this)
throw new TypeError();
if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
var then = newValue.then;
if (typeof then === 'function') {
doResolve(then.bind(newValue), resolve.bind(this), reject.bind(this));
return;
}
}
this._state = true;
this._value = newValue;
finale.call(this);
} catch (e) {
reject.call(this, e);
}
}
function reject(newValue) {
this._state = false;
this._value = newValue;
finale.call(this);
}
function finale() {
for (var i = 0, len = this._deferreds.length; i < len; i++) {
handle.call(this, this._deferreds[i]);
}
this._deferreds = null;
}
function doResolve(fn, onFulfilled, onRejected) {
var done = false;
try {
fn(function (value) {
if (done)
return;
done = true;
onFulfilled(value);
}, function (reason) {
if (done)
return;
done = true;
onRejected(reason);
});
} catch (ex) {
if (done)
return;
done = true;
onRejected(ex);
}
}
Promise.prototype['catch'] = function (onRejected) {
return this.then(null, onRejected);
};
Promise.prototype.then = function (onFulfilled, onRejected) {
var me = this;
return new Promise(function (resolve, reject) {
handle.call(me, {
onFulfilled: onFulfilled,
onRejected: onRejected,
resolve: resolve,
reject: reject
});
});
};
Promise.resolve = function (value) {
if (value && typeof value === 'object' && value.constructor === Promise) {
return value;
}
return new Promise(function (resolve) {
resolve(value);
});
};
Promise.reject = function (value) {
return new Promise(function (resolve, reject) {
reject(value);
});
};
return Promise;
}
if (typeof module !== 'undefined') {
module.exports = MakePromise;
};
if (!window.Promise) {
window.Promise = MakePromise(Polymer.Base.async);
};
'use strict';
Polymer({
is: 'iron-request',
hostAttributes: { hidden: true },
properties: {
xhr: {
type: Object,
notify: true,
readOnly: true,
value: function () {
return new XMLHttpRequest();
}
},
response: {
type: Object,
notify: true,
readOnly: true,
value: function () {
return null;
}
},
status: {
type: Number,
notify: true,
readOnly: true,
value: 0
},
statusText: {
type: String,
notify: true,
readOnly: true,
value: ''
},
completes: {
type: Object,
readOnly: true,
notify: true,
value: function () {
return new Promise(function (resolve, reject) {
this.resolveCompletes = resolve;
this.rejectCompletes = reject;
}.bind(this));
}
},
progress: {
type: Object,
notify: true,
readOnly: true,
value: function () {
return {};
}
},
aborted: {
type: Boolean,
notify: true,
readOnly: true,
value: false
},
errored: {
type: Boolean,
notify: true,
readOnly: true,
value: false
},
timedOut: {
type: Boolean,
notify: true,
readOnly: true,
value: false
}
},
get succeeded() {
if (this.errored || this.aborted || this.timedOut) {
return false;
}
var status = this.xhr.status || 0;
return status === 0 || status >= 200 && status < 300;
},
send: function (options) {
var xhr = this.xhr;
if (xhr.readyState > 0) {
return null;
}
xhr.addEventListener('progress', function (progress) {
this._setProgress({
lengthComputable: progress.lengthComputable,
loaded: progress.loaded,
total: progress.total
});
}.bind(this));
xhr.addEventListener('error', function (error) {
this._setErrored(true);
this._updateStatus();
this.rejectCompletes(error);
}.bind(this));
xhr.addEventListener('timeout', function (error) {
this._setTimedOut(true);
this._updateStatus();
this.rejectCompletes(error);
}.bind(this));
xhr.addEventListener('abort', function () {
this._updateStatus();
this.rejectCompletes(new Error('Request aborted.'));
}.bind(this));
xhr.addEventListener('loadend', function () {
this._updateStatus();
if (!this.succeeded) {
this.rejectCompletes(new Error('The request failed with status code: ' + this.xhr.status));
return;
}
this._setResponse(this.parseResponse());
this.resolveCompletes(this);
}.bind(this));
this.url = options.url;
xhr.open(options.method || 'GET', options.url, options.async !== false);
var acceptType = {
'json': 'application/json',
'text': 'text/plain',
'html': 'text/html',
'xml': 'application/xml',
'arraybuffer': 'application/octet-stream'
}[options.handleAs];
var headers = options.headers || Object.create(null);
var newHeaders = Object.create(null);
for (var key in headers) {
newHeaders[key.toLowerCase()] = headers[key];
}
headers = newHeaders;
if (acceptType && !headers['accept']) {
headers['accept'] = acceptType;
}
Object.keys(headers).forEach(function (requestHeader) {
if (/[A-Z]/.test(requestHeader)) {
console.error('Headers must be lower case, got', requestHeader);
}
xhr.setRequestHeader(requestHeader, headers[requestHeader]);
}, this);
if (options.async !== false) {
var handleAs = options.handleAs;
if (!!options.jsonPrefix || !handleAs) {
handleAs = 'text';
}
xhr.responseType = xhr._responseType = handleAs;
if (!!options.jsonPrefix) {
xhr._jsonPrefix = options.jsonPrefix;
}
}
xhr.withCredentials = !!options.withCredentials;
xhr.timeout = options.timeout;
var body = this._encodeBodyObject(options.body, headers['content-type']);
xhr.send(body);
return this.completes;
},
parseResponse: function () {
var xhr = this.xhr;
var responseType = xhr.responseType || xhr._responseType;
var preferResponseText = !this.xhr.responseType;
var prefixLen = xhr._jsonPrefix && xhr._jsonPrefix.length || 0;
try {
switch (responseType) {
case 'json':
if (preferResponseText || xhr.response === undefined) {
try {
return JSON.parse(xhr.responseText);
} catch (_) {
return null;
}
}
return xhr.response;
case 'xml':
return xhr.responseXML;
case 'blob':
case 'document':
case 'arraybuffer':
return xhr.response;
case 'text':
default: {
if (prefixLen) {
try {
return JSON.parse(xhr.responseText.substring(prefixLen));
} catch (_) {
return null;
}
}
return xhr.responseText;
}
}
} catch (e) {
this.rejectCompletes(new Error('Could not parse response. ' + e.message));
}
},
abort: function () {
this._setAborted(true);
this.xhr.abort();
},
_encodeBodyObject: function (body, contentType) {
if (typeof body == 'string') {
return body;
}
var bodyObj = body;
switch (contentType) {
case 'application/json':
return JSON.stringify(bodyObj);
case 'application/x-www-form-urlencoded':
return this._wwwFormUrlEncode(bodyObj);
}
return body;
},
_wwwFormUrlEncode: function (object) {
if (!object) {
return '';
}
var pieces = [];
Object.keys(object).forEach(function (key) {
pieces.push(this._wwwFormUrlEncodePiece(key) + '=' + this._wwwFormUrlEncodePiece(object[key]));
}, this);
return pieces.join('&');
},
_wwwFormUrlEncodePiece: function (str) {
return encodeURIComponent(str.toString().replace(/\r?\n/g, '\r\n')).replace(/%20/g, '+');
},
_updateStatus: function () {
this._setStatus(this.xhr.status);
this._setStatusText(this.xhr.statusText === undefined ? '' : this.xhr.statusText);
}
});
'use strict';
Polymer({
is: 'iron-ajax',
hostAttributes: { hidden: true },
properties: {
url: { type: String },
params: {
type: Object,
value: function () {
return {};
}
},
method: {
type: String,
value: 'GET'
},
headers: {
type: Object,
value: function () {
return {};
}
},
contentType: {
type: String,
value: null
},
body: {
type: Object,
value: null
},
sync: {
type: Boolean,
value: false
},
handleAs: {
type: String,
value: 'json'
},
withCredentials: {
type: Boolean,
value: false
},
timeout: {
type: Number,
value: 0
},
auto: {
type: Boolean,
value: false
},
verbose: {
type: Boolean,
value: false
},
lastRequest: {
type: Object,
notify: true,
readOnly: true
},
loading: {
type: Boolean,
notify: true,
readOnly: true
},
lastResponse: {
type: Object,
notify: true,
readOnly: true
},
lastError: {
type: Object,
notify: true,
readOnly: true
},
activeRequests: {
type: Array,
notify: true,
readOnly: true,
value: function () {
return [];
}
},
debounceDuration: {
type: Number,
value: 0,
notify: true
},
jsonPrefix: {
type: String,
value: ''
},
bubbles: {
type: Boolean,
value: false
},
_boundHandleResponse: {
type: Function,
value: function () {
return this._handleResponse.bind(this);
}
}
},
observers: ['_requestOptionsChanged(url, method, params.*, headers, contentType, ' + 'body, sync, handleAs, jsonPrefix, withCredentials, timeout, auto)'],
get queryString() {
var queryParts = [];
var param;
var value;
for (param in this.params) {
value = this.params[param];
param = window.encodeURIComponent(param);
if (Array.isArray(value)) {
for (var i = 0; i < value.length; i++) {
queryParts.push(param + '=' + window.encodeURIComponent(value[i]));
}
} else if (value !== null) {
queryParts.push(param + '=' + window.encodeURIComponent(value));
} else {
queryParts.push(param);
}
}
return queryParts.join('&');
},
get requestUrl() {
var queryString = this.queryString;
if (queryString) {
var bindingChar = this.url.indexOf('?') >= 0 ? '&' : '?';
return this.url + bindingChar + queryString;
}
return this.url;
},
get requestHeaders() {
var headers = {};
var contentType = this.contentType;
if (contentType == null && typeof this.body === 'string') {
contentType = 'application/x-www-form-urlencoded';
}
if (contentType) {
headers['content-type'] = contentType;
}
var header;
if (this.headers instanceof Object) {
for (header in this.headers) {
headers[header] = this.headers[header].toString();
}
}
return headers;
},
toRequestOptions: function () {
return {
url: this.requestUrl || '',
method: this.method,
headers: this.requestHeaders,
body: this.body,
async: !this.sync,
handleAs: this.handleAs,
jsonPrefix: this.jsonPrefix,
withCredentials: this.withCredentials,
timeout: this.timeout
};
},
generateRequest: function () {
var request = document.createElement('iron-request');
var requestOptions = this.toRequestOptions();
this.activeRequests.push(request);
request.completes.then(this._boundHandleResponse).catch(this._handleError.bind(this, request)).then(this._discardRequest.bind(this, request));
request.send(requestOptions);
this._setLastRequest(request);
this._setLoading(true);
this.fire('request', {
request: request,
options: requestOptions
}, { bubbles: this.bubbles });
return request;
},
_handleResponse: function (request) {
if (request === this.lastRequest) {
this._setLastResponse(request.response);
this._setLastError(null);
this._setLoading(false);
}
this.fire('response', request, { bubbles: this.bubbles });
},
_handleError: function (request, error) {
if (this.verbose) {
console.error(error);
}
if (request === this.lastRequest) {
this._setLastError({
request: request,
error: error
});
this._setLastResponse(null);
this._setLoading(false);
}
this.fire('error', {
request: request,
error: error
}, { bubbles: this.bubbles });
},
_discardRequest: function (request) {
var requestIndex = this.activeRequests.indexOf(request);
if (requestIndex > -1) {
this.activeRequests.splice(requestIndex, 1);
}
},
_requestOptionsChanged: function () {
this.debounce('generate-request', function () {
if (this.url == null) {
return;
}
if (this.auto) {
this.generateRequest();
}
}, this.debounceDuration);
}
});
Polymer.IronSelection = function (selectCallback) {
this.selection = [];
this.selectCallback = selectCallback;
};
Polymer.IronSelection.prototype = {
get: function () {
return this.multi ? this.selection.slice() : this.selection[0];
},
clear: function (excludes) {
this.selection.slice().forEach(function (item) {
if (!excludes || excludes.indexOf(item) < 0) {
this.setItemSelected(item, false);
}
}, this);
},
isSelected: function (item) {
return this.selection.indexOf(item) >= 0;
},
setItemSelected: function (item, isSelected) {
if (item != null) {
if (isSelected !== this.isSelected(item)) {
if (isSelected) {
this.selection.push(item);
} else {
var i = this.selection.indexOf(item);
if (i >= 0) {
this.selection.splice(i, 1);
}
}
if (this.selectCallback) {
this.selectCallback(item, isSelected);
}
}
}
},
select: function (item) {
if (this.multi) {
this.toggle(item);
} else if (this.get() !== item) {
this.setItemSelected(this.get(), false);
this.setItemSelected(item, true);
}
},
toggle: function (item) {
this.setItemSelected(item, !this.isSelected(item));
}
};
Polymer.IronSelectableBehavior = {
properties: {
attrForSelected: {
type: String,
value: null
},
selected: {
type: String,
notify: true
},
selectedItem: {
type: Object,
readOnly: true,
notify: true
},
activateEvent: {
type: String,
value: 'tap',
observer: '_activateEventChanged'
},
selectable: String,
selectedClass: {
type: String,
value: 'iron-selected'
},
selectedAttribute: {
type: String,
value: null
},
items: {
type: Array,
readOnly: true,
notify: true,
value: function () {
return [];
}
},
_excludedLocalNames: {
type: Object,
value: function () {
return { 'template': 1 };
}
}
},
observers: [
'_updateAttrForSelected(attrForSelected)',
'_updateSelected(selected)'
],
created: function () {
this._bindFilterItem = this._filterItem.bind(this);
this._selection = new Polymer.IronSelection(this._applySelection.bind(this));
},
attached: function () {
this._observer = this._observeItems(this);
this._updateItems();
if (!this._shouldUpdateSelection) {
this._updateSelected();
}
this._addListener(this.activateEvent);
},
detached: function () {
if (this._observer) {
Polymer.dom(this).unobserveNodes(this._observer);
}
this._removeListener(this.activateEvent);
},
indexOf: function (item) {
return this.items.indexOf(item);
},
select: function (value) {
this.selected = value;
},
selectPrevious: function () {
var length = this.items.length;
var index = (Number(this._valueToIndex(this.selected)) - 1 + length) % length;
this.selected = this._indexToValue(index);
},
selectNext: function () {
var index = (Number(this._valueToIndex(this.selected)) + 1) % this.items.length;
this.selected = this._indexToValue(index);
},
forceSynchronousItemUpdate: function () {
this._updateItems();
},
get _shouldUpdateSelection() {
return this.selected != null;
},
_addListener: function (eventName) {
this.listen(this, eventName, '_activateHandler');
},
_removeListener: function (eventName) {
this.unlisten(this, eventName, '_activateHandler');
},
_activateEventChanged: function (eventName, old) {
this._removeListener(old);
this._addListener(eventName);
},
_updateItems: function () {
var nodes = Polymer.dom(this).queryDistributedElements(this.selectable || '*');
nodes = Array.prototype.filter.call(nodes, this._bindFilterItem);
this._setItems(nodes);
},
_updateAttrForSelected: function () {
if (this._shouldUpdateSelection) {
this.selected = this._indexToValue(this.indexOf(this.selectedItem));
}
},
_updateSelected: function () {
this._selectSelected(this.selected);
},
_selectSelected: function (selected) {
this._selection.select(this._valueToItem(this.selected));
},
_filterItem: function (node) {
return !this._excludedLocalNames[node.localName];
},
_valueToItem: function (value) {
return value == null ? null : this.items[this._valueToIndex(value)];
},
_valueToIndex: function (value) {
if (this.attrForSelected) {
for (var i = 0, item; item = this.items[i]; i++) {
if (this._valueForItem(item) == value) {
return i;
}
}
} else {
return Number(value);
}
},
_indexToValue: function (index) {
if (this.attrForSelected) {
var item = this.items[index];
if (item) {
return this._valueForItem(item);
}
} else {
return index;
}
},
_valueForItem: function (item) {
var propValue = item[Polymer.CaseMap.dashToCamelCase(this.attrForSelected)];
return propValue != undefined ? propValue : item.getAttribute(this.attrForSelected);
},
_applySelection: function (item, isSelected) {
if (this.selectedClass) {
this.toggleClass(this.selectedClass, isSelected, item);
}
if (this.selectedAttribute) {
this.toggleAttribute(this.selectedAttribute, isSelected, item);
}
this._selectionChange();
this.fire('iron-' + (isSelected ? 'select' : 'deselect'), { item: item });
},
_selectionChange: function () {
this._setSelectedItem(this._selection.get());
},
_observeItems: function (node) {
return Polymer.dom(node).observeNodes(function (mutations) {
this._updateItems();
if (this._shouldUpdateSelection) {
this._updateSelected();
}
this.fire('iron-items-changed', mutations, {
bubbles: false,
cancelable: false
});
});
},
_activateHandler: function (e) {
var t = e.target;
var items = this.items;
while (t && t != this) {
var i = items.indexOf(t);
if (i >= 0) {
var value = this._indexToValue(i);
this._itemActivate(value, t);
return;
}
t = t.parentNode;
}
},
_itemActivate: function (value, item) {
if (!this.fire('iron-activate', {
selected: value,
item: item
}, { cancelable: true }).defaultPrevented) {
this.select(value);
}
}
};
Polymer.IronMultiSelectableBehaviorImpl = {
properties: {
multi: {
type: Boolean,
value: false,
observer: 'multiChanged'
},
selectedValues: {
type: Array,
notify: true
},
selectedItems: {
type: Array,
readOnly: true,
notify: true
}
},
observers: ['_updateSelected(selectedValues.splices)'],
select: function (value) {
if (this.multi) {
if (this.selectedValues) {
this._toggleSelected(value);
} else {
this.selectedValues = [value];
}
} else {
this.selected = value;
}
},
multiChanged: function (multi) {
this._selection.multi = multi;
},
get _shouldUpdateSelection() {
return this.selected != null || this.selectedValues != null && this.selectedValues.length;
},
_updateAttrForSelected: function () {
if (!this.multi) {
Polymer.IronSelectableBehavior._updateAttrForSelected.apply(this);
} else if (this._shouldUpdateSelection) {
this.selectedValues = this.selectedItems.map(function (selectedItem) {
return this._indexToValue(this.indexOf(selectedItem));
}, this).filter(function (unfilteredValue) {
return unfilteredValue != null;
}, this);
}
},
_updateSelected: function () {
if (this.multi) {
this._selectMulti(this.selectedValues);
} else {
this._selectSelected(this.selected);
}
},
_selectMulti: function (values) {
if (values) {
var selectedItems = this._valuesToItems(values);
this._selection.clear(selectedItems);
for (var i = 0; i < selectedItems.length; i++) {
this._selection.setItemSelected(selectedItems[i], true);
}
} else {
this._selection.clear();
}
},
_selectionChange: function () {
var s = this._selection.get();
if (this.multi) {
this._setSelectedItems(s);
} else {
this._setSelectedItems([s]);
this._setSelectedItem(s);
}
},
_toggleSelected: function (value) {
var i = this.selectedValues.indexOf(value);
var unselected = i < 0;
if (unselected) {
this.push('selectedValues', value);
} else {
this.splice('selectedValues', i, 1);
}
this._selection.setItemSelected(this._valueToItem(value), unselected);
},
_valuesToItems: function (values) {
return values == null ? null : values.map(function (value) {
return this._valueToItem(value);
}, this);
}
};
Polymer.IronMultiSelectableBehavior = [
Polymer.IronSelectableBehavior,
Polymer.IronMultiSelectableBehaviorImpl
];
Polymer({
is: 'iron-selector',
behaviors: [Polymer.IronMultiSelectableBehavior]
});
Polymer({
is: 'iron-image',
properties: {
src: {
observer: '_srcChanged',
type: String,
value: ''
},
alt: {
type: String,
value: null
},
preventLoad: {
type: Boolean,
value: false,
observer: '_preventLoadChanged'
},
sizing: {
type: String,
value: null,
reflectToAttribute: true
},
position: {
type: String,
value: 'center'
},
preload: {
type: Boolean,
value: false
},
placeholder: {
type: String,
value: null,
observer: '_placeholderChanged'
},
fade: {
type: Boolean,
value: false
},
loaded: {
notify: true,
readOnly: true,
type: Boolean,
value: false
},
loading: {
notify: true,
readOnly: true,
type: Boolean,
value: false
},
error: {
notify: true,
readOnly: true,
type: Boolean,
value: false
},
width: {
observer: '_widthChanged',
type: Number,
value: null
},
height: {
observer: '_heightChanged',
type: Number,
value: null
}
},
observers: ['_transformChanged(sizing, position)'],
ready: function () {
var img = this.$.img;
img.onload = function () {
if (this.$.img.src !== this._resolveSrc(this.src))
return;
this._setLoading(false);
this._setLoaded(true);
this._setError(false);
}.bind(this);
img.onerror = function () {
if (this.$.img.src !== this._resolveSrc(this.src))
return;
this._reset();
this._setLoading(false);
this._setLoaded(false);
this._setError(true);
}.bind(this);
this._resolvedSrc = '';
},
_load: function (src) {
if (src) {
this.$.img.src = src;
} else {
this.$.img.removeAttribute('src');
}
this.$.sizedImgDiv.style.backgroundImage = src ? 'url("' + src + '")' : '';
this._setLoading(!!src);
this._setLoaded(false);
this._setError(false);
},
_reset: function () {
this.$.img.removeAttribute('src');
this.$.sizedImgDiv.style.backgroundImage = '';
this._setLoading(false);
this._setLoaded(false);
this._setError(false);
},
_computePlaceholderHidden: function () {
return !this.preload || !this.fade && !this.loading && this.loaded;
},
_computePlaceholderClassName: function () {
return this.preload && this.fade && !this.loading && this.loaded ? 'faded-out' : '';
},
_computeImgDivHidden: function () {
return !this.sizing;
},
_computeImgDivARIAHidden: function () {
return this.alt === '' ? 'true' : undefined;
},
_computeImgDivARIALabel: function () {
if (this.alt !== null) {
return this.alt;
}
if (this.src === '') {
return '';
}
var pathComponents = new URL(this._resolveSrc(this.src)).pathname.split('/');
return pathComponents[pathComponents.length - 1];
},
_computeImgHidden: function () {
return !!this.sizing;
},
_widthChanged: function () {
this.style.width = isNaN(this.width) ? this.width : this.width + 'px';
},
_heightChanged: function () {
this.style.height = isNaN(this.height) ? this.height : this.height + 'px';
},
_preventLoadChanged: function () {
if (this.preventLoad || this.loaded)
return;
this._reset();
this._load(this.src);
},
_srcChanged: function (newSrc, oldSrc) {
var newResolvedSrc = this._resolveSrc(newSrc);
if (newResolvedSrc === this._resolvedSrc)
return;
this._resolvedSrc = newResolvedSrc;
this._reset();
if (!this.preventLoad) {
this._load(newSrc);
}
},
_placeholderChanged: function () {
this.$.placeholder.style.backgroundImage = this.placeholder ? 'url("' + this.placeholder + '")' : '';
},
_transformChanged: function () {
var sizedImgDivStyle = this.$.sizedImgDiv.style;
var placeholderStyle = this.$.placeholder.style;
sizedImgDivStyle.backgroundSize = placeholderStyle.backgroundSize = this.sizing;
sizedImgDivStyle.backgroundPosition = placeholderStyle.backgroundPosition = this.sizing ? this.position : '';
sizedImgDivStyle.backgroundRepeat = placeholderStyle.backgroundRepeat = this.sizing ? 'no-repeat' : '';
},
_resolveSrc: function (testSrc) {
return Polymer.ResolveUrl.resolveUrl(testSrc, this.ownerDocument.baseURI);
}
});
Polymer({
is: 'iron-media-query',
properties: {
queryMatches: {
type: Boolean,
value: false,
readOnly: true,
notify: true
},
query: {
type: String,
observer: 'queryChanged'
},
full: {
type: Boolean,
value: false
},
_boundMQHandler: {
value: function () {
return this.queryHandler.bind(this);
}
},
_mq: { value: null }
},
attached: function () {
this.style.display = 'none';
this.queryChanged();
},
detached: function () {
this._remove();
},
_add: function () {
if (this._mq) {
this._mq.addListener(this._boundMQHandler);
}
},
_remove: function () {
if (this._mq) {
this._mq.removeListener(this._boundMQHandler);
}
this._mq = null;
},
queryChanged: function () {
this._remove();
var query = this.query;
if (!query) {
return;
}
if (!this.full && query[0] !== '(') {
query = '(' + query + ')';
}
this._mq = window.matchMedia(query);
this._add();
this.queryHandler(this._mq);
},
queryHandler: function (mq) {
this._setQueryMatches(mq.matches);
}
});
(function () {
'use strict';
var KEY_IDENTIFIER = {
'U+0008': 'backspace',
'U+0009': 'tab',
'U+001B': 'esc',
'U+0020': 'space',
'U+007F': 'del'
};
var KEY_CODE = {
8: 'backspace',
9: 'tab',
13: 'enter',
27: 'esc',
33: 'pageup',
34: 'pagedown',
35: 'end',
36: 'home',
32: 'space',
37: 'left',
38: 'up',
39: 'right',
40: 'down',
46: 'del',
106: '*'
};
var MODIFIER_KEYS = {
'shift': 'shiftKey',
'ctrl': 'ctrlKey',
'alt': 'altKey',
'meta': 'metaKey'
};
var KEY_CHAR = /[a-z0-9*]/;
var IDENT_CHAR = /U\+/;
var ARROW_KEY = /^arrow/;
var SPACE_KEY = /^space(bar)?/;
var ESC_KEY = /^escape$/;
function transformKey(key, noSpecialChars) {
var validKey = '';
if (key) {
var lKey = key.toLowerCase();
if (lKey === ' ' || SPACE_KEY.test(lKey)) {
validKey = 'space';
} else if (ESC_KEY.test(lKey)) {
validKey = 'esc';
} else if (lKey.length == 1) {
if (!noSpecialChars || KEY_CHAR.test(lKey)) {
validKey = lKey;
}
} else if (ARROW_KEY.test(lKey)) {
validKey = lKey.replace('arrow', '');
} else if (lKey == 'multiply') {
validKey = '*';
} else {
validKey = lKey;
}
}
return validKey;
}
function transformKeyIdentifier(keyIdent) {
var validKey = '';
if (keyIdent) {
if (keyIdent in KEY_IDENTIFIER) {
validKey = KEY_IDENTIFIER[keyIdent];
} else if (IDENT_CHAR.test(keyIdent)) {
keyIdent = parseInt(keyIdent.replace('U+', '0x'), 16);
validKey = String.fromCharCode(keyIdent).toLowerCase();
} else {
validKey = keyIdent.toLowerCase();
}
}
return validKey;
}
function transformKeyCode(keyCode) {
var validKey = '';
if (Number(keyCode)) {
if (keyCode >= 65 && keyCode <= 90) {
validKey = String.fromCharCode(32 + keyCode);
} else if (keyCode >= 112 && keyCode <= 123) {
validKey = 'f' + (keyCode - 112);
} else if (keyCode >= 48 && keyCode <= 57) {
validKey = String(keyCode - 48);
} else if (keyCode >= 96 && keyCode <= 105) {
validKey = String(keyCode - 96);
} else {
validKey = KEY_CODE[keyCode];
}
}
return validKey;
}
function normalizedKeyForEvent(keyEvent, noSpecialChars) {
return transformKey(keyEvent.key, noSpecialChars) || transformKeyIdentifier(keyEvent.keyIdentifier) || transformKeyCode(keyEvent.keyCode) || transformKey(keyEvent.detail.key, noSpecialChars) || '';
}
function keyComboMatchesEvent(keyCombo, event) {
var keyEvent = normalizedKeyForEvent(event, keyCombo.hasModifiers);
return keyEvent === keyCombo.key && (!keyCombo.hasModifiers || !!event.shiftKey === !!keyCombo.shiftKey && !!event.ctrlKey === !!keyCombo.ctrlKey && !!event.altKey === !!keyCombo.altKey && !!event.metaKey === !!keyCombo.metaKey);
}
function parseKeyComboString(keyComboString) {
if (keyComboString.length === 1) {
return {
combo: keyComboString,
key: keyComboString,
event: 'keydown'
};
}
return keyComboString.split('+').reduce(function (parsedKeyCombo, keyComboPart) {
var eventParts = keyComboPart.split(':');
var keyName = eventParts[0];
var event = eventParts[1];
if (keyName in MODIFIER_KEYS) {
parsedKeyCombo[MODIFIER_KEYS[keyName]] = true;
parsedKeyCombo.hasModifiers = true;
} else {
parsedKeyCombo.key = keyName;
parsedKeyCombo.event = event || 'keydown';
}
return parsedKeyCombo;
}, { combo: keyComboString.split(':').shift() });
}
function parseEventString(eventString) {
return eventString.trim().split(' ').map(function (keyComboString) {
return parseKeyComboString(keyComboString);
});
}
Polymer.IronA11yKeysBehavior = {
properties: {
keyEventTarget: {
type: Object,
value: function () {
return this;
}
},
stopKeyboardEventPropagation: {
type: Boolean,
value: false
},
_boundKeyHandlers: {
type: Array,
value: function () {
return [];
}
},
_imperativeKeyBindings: {
type: Object,
value: function () {
return {};
}
}
},
observers: ['_resetKeyEventListeners(keyEventTarget, _boundKeyHandlers)'],
keyBindings: {},
registered: function () {
this._prepKeyBindings();
},
attached: function () {
this._listenKeyEventListeners();
},
detached: function () {
this._unlistenKeyEventListeners();
},
addOwnKeyBinding: function (eventString, handlerName) {
this._imperativeKeyBindings[eventString] = handlerName;
this._prepKeyBindings();
this._resetKeyEventListeners();
},
removeOwnKeyBindings: function () {
this._imperativeKeyBindings = {};
this._prepKeyBindings();
this._resetKeyEventListeners();
},
keyboardEventMatchesKeys: function (event, eventString) {
var keyCombos = parseEventString(eventString);
for (var i = 0; i < keyCombos.length; ++i) {
if (keyComboMatchesEvent(keyCombos[i], event)) {
return true;
}
}
return false;
},
_collectKeyBindings: function () {
var keyBindings = this.behaviors.map(function (behavior) {
return behavior.keyBindings;
});
if (keyBindings.indexOf(this.keyBindings) === -1) {
keyBindings.push(this.keyBindings);
}
return keyBindings;
},
_prepKeyBindings: function () {
this._keyBindings = {};
this._collectKeyBindings().forEach(function (keyBindings) {
for (var eventString in keyBindings) {
this._addKeyBinding(eventString, keyBindings[eventString]);
}
}, this);
for (var eventString in this._imperativeKeyBindings) {
this._addKeyBinding(eventString, this._imperativeKeyBindings[eventString]);
}
for (var eventName in this._keyBindings) {
this._keyBindings[eventName].sort(function (kb1, kb2) {
var b1 = kb1[0].hasModifiers;
var b2 = kb2[0].hasModifiers;
return b1 === b2 ? 0 : b1 ? -1 : 1;
});
}
},
_addKeyBinding: function (eventString, handlerName) {
parseEventString(eventString).forEach(function (keyCombo) {
this._keyBindings[keyCombo.event] = this._keyBindings[keyCombo.event] || [];
this._keyBindings[keyCombo.event].push([
keyCombo,
handlerName
]);
}, this);
},
_resetKeyEventListeners: function () {
this._unlistenKeyEventListeners();
if (this.isAttached) {
this._listenKeyEventListeners();
}
},
_listenKeyEventListeners: function () {
Object.keys(this._keyBindings).forEach(function (eventName) {
var keyBindings = this._keyBindings[eventName];
var boundKeyHandler = this._onKeyBindingEvent.bind(this, keyBindings);
this._boundKeyHandlers.push([
this.keyEventTarget,
eventName,
boundKeyHandler
]);
this.keyEventTarget.addEventListener(eventName, boundKeyHandler);
}, this);
},
_unlistenKeyEventListeners: function () {
var keyHandlerTuple;
var keyEventTarget;
var eventName;
var boundKeyHandler;
while (this._boundKeyHandlers.length) {
keyHandlerTuple = this._boundKeyHandlers.pop();
keyEventTarget = keyHandlerTuple[0];
eventName = keyHandlerTuple[1];
boundKeyHandler = keyHandlerTuple[2];
keyEventTarget.removeEventListener(eventName, boundKeyHandler);
}
},
_onKeyBindingEvent: function (keyBindings, event) {
if (this.stopKeyboardEventPropagation) {
event.stopPropagation();
}
if (event.defaultPrevented) {
return;
}
for (var i = 0; i < keyBindings.length; i++) {
var keyCombo = keyBindings[i][0];
var handlerName = keyBindings[i][1];
if (keyComboMatchesEvent(keyCombo, event)) {
this._triggerKeyHandler(keyCombo, handlerName, event);
if (event.defaultPrevented) {
return;
}
}
}
},
_triggerKeyHandler: function (keyCombo, handlerName, keyboardEvent) {
var detail = Object.create(keyCombo);
detail.keyboardEvent = keyboardEvent;
var event = new CustomEvent(keyCombo.event, {
detail: detail,
cancelable: true
});
this[handlerName].call(this, event);
if (event.defaultPrevented) {
keyboardEvent.preventDefault();
}
}
};
}());
(function () {
var Utility = {
distance: function (x1, y1, x2, y2) {
var xDelta = x1 - x2;
var yDelta = y1 - y2;
return Math.sqrt(xDelta * xDelta + yDelta * yDelta);
},
now: window.performance && window.performance.now ? window.performance.now.bind(window.performance) : Date.now
};
function ElementMetrics(element) {
this.element = element;
this.width = this.boundingRect.width;
this.height = this.boundingRect.height;
this.size = Math.max(this.width, this.height);
}
ElementMetrics.prototype = {
get boundingRect() {
return this.element.getBoundingClientRect();
},
furthestCornerDistanceFrom: function (x, y) {
var topLeft = Utility.distance(x, y, 0, 0);
var topRight = Utility.distance(x, y, this.width, 0);
var bottomLeft = Utility.distance(x, y, 0, this.height);
var bottomRight = Utility.distance(x, y, this.width, this.height);
return Math.max(topLeft, topRight, bottomLeft, bottomRight);
}
};
function Ripple(element) {
this.element = element;
this.color = window.getComputedStyle(element).color;
this.wave = document.createElement('div');
this.waveContainer = document.createElement('div');
this.wave.style.backgroundColor = this.color;
this.wave.classList.add('wave');
this.waveContainer.classList.add('wave-container');
Polymer.dom(this.waveContainer).appendChild(this.wave);
this.resetInteractionState();
}
Ripple.MAX_RADIUS = 300;
Ripple.prototype = {
get recenters() {
return this.element.recenters;
},
get center() {
return this.element.center;
},
get mouseDownElapsed() {
var elapsed;
if (!this.mouseDownStart) {
return 0;
}
elapsed = Utility.now() - this.mouseDownStart;
if (this.mouseUpStart) {
elapsed -= this.mouseUpElapsed;
}
return elapsed;
},
get mouseUpElapsed() {
return this.mouseUpStart ? Utility.now() - this.mouseUpStart : 0;
},
get mouseDownElapsedSeconds() {
return this.mouseDownElapsed / 1000;
},
get mouseUpElapsedSeconds() {
return this.mouseUpElapsed / 1000;
},
get mouseInteractionSeconds() {
return this.mouseDownElapsedSeconds + this.mouseUpElapsedSeconds;
},
get initialOpacity() {
return this.element.initialOpacity;
},
get opacityDecayVelocity() {
return this.element.opacityDecayVelocity;
},
get radius() {
var width2 = this.containerMetrics.width * this.containerMetrics.width;
var height2 = this.containerMetrics.height * this.containerMetrics.height;
var waveRadius = Math.min(Math.sqrt(width2 + height2), Ripple.MAX_RADIUS) * 1.1 + 5;
var duration = 1.1 - 0.2 * (waveRadius / Ripple.MAX_RADIUS);
var timeNow = this.mouseInteractionSeconds / duration;
var size = waveRadius * (1 - Math.pow(80, -timeNow));
return Math.abs(size);
},
get opacity() {
if (!this.mouseUpStart) {
return this.initialOpacity;
}
return Math.max(0, this.initialOpacity - this.mouseUpElapsedSeconds * this.opacityDecayVelocity);
},
get outerOpacity() {
var outerOpacity = this.mouseUpElapsedSeconds * 0.3;
var waveOpacity = this.opacity;
return Math.max(0, Math.min(outerOpacity, waveOpacity));
},
get isOpacityFullyDecayed() {
return this.opacity < 0.01 && this.radius >= Math.min(this.maxRadius, Ripple.MAX_RADIUS);
},
get isRestingAtMaxRadius() {
return this.opacity >= this.initialOpacity && this.radius >= Math.min(this.maxRadius, Ripple.MAX_RADIUS);
},
get isAnimationComplete() {
return this.mouseUpStart ? this.isOpacityFullyDecayed : this.isRestingAtMaxRadius;
},
get translationFraction() {
return Math.min(1, this.radius / this.containerMetrics.size * 2 / Math.sqrt(2));
},
get xNow() {
if (this.xEnd) {
return this.xStart + this.translationFraction * (this.xEnd - this.xStart);
}
return this.xStart;
},
get yNow() {
if (this.yEnd) {
return this.yStart + this.translationFraction * (this.yEnd - this.yStart);
}
return this.yStart;
},
get isMouseDown() {
return this.mouseDownStart && !this.mouseUpStart;
},
resetInteractionState: function () {
this.maxRadius = 0;
this.mouseDownStart = 0;
this.mouseUpStart = 0;
this.xStart = 0;
this.yStart = 0;
this.xEnd = 0;
this.yEnd = 0;
this.slideDistance = 0;
this.containerMetrics = new ElementMetrics(this.element);
},
draw: function () {
var scale;
var translateString;
var dx;
var dy;
this.wave.style.opacity = this.opacity;
scale = this.radius / (this.containerMetrics.size / 2);
dx = this.xNow - this.containerMetrics.width / 2;
dy = this.yNow - this.containerMetrics.height / 2;
this.waveContainer.style.webkitTransform = 'translate(' + dx + 'px, ' + dy + 'px)';
this.waveContainer.style.transform = 'translate3d(' + dx + 'px, ' + dy + 'px, 0)';
this.wave.style.webkitTransform = 'scale(' + scale + ',' + scale + ')';
this.wave.style.transform = 'scale3d(' + scale + ',' + scale + ',1)';
},
downAction: function (event) {
var xCenter = this.containerMetrics.width / 2;
var yCenter = this.containerMetrics.height / 2;
this.resetInteractionState();
this.mouseDownStart = Utility.now();
if (this.center) {
this.xStart = xCenter;
this.yStart = yCenter;
this.slideDistance = Utility.distance(this.xStart, this.yStart, this.xEnd, this.yEnd);
} else {
this.xStart = event ? event.detail.x - this.containerMetrics.boundingRect.left : this.containerMetrics.width / 2;
this.yStart = event ? event.detail.y - this.containerMetrics.boundingRect.top : this.containerMetrics.height / 2;
}
if (this.recenters) {
this.xEnd = xCenter;
this.yEnd = yCenter;
this.slideDistance = Utility.distance(this.xStart, this.yStart, this.xEnd, this.yEnd);
}
this.maxRadius = this.containerMetrics.furthestCornerDistanceFrom(this.xStart, this.yStart);
this.waveContainer.style.top = (this.containerMetrics.height - this.containerMetrics.size) / 2 + 'px';
this.waveContainer.style.left = (this.containerMetrics.width - this.containerMetrics.size) / 2 + 'px';
this.waveContainer.style.width = this.containerMetrics.size + 'px';
this.waveContainer.style.height = this.containerMetrics.size + 'px';
},
upAction: function (event) {
if (!this.isMouseDown) {
return;
}
this.mouseUpStart = Utility.now();
},
remove: function () {
Polymer.dom(this.waveContainer.parentNode).removeChild(this.waveContainer);
}
};
Polymer({
is: 'paper-ripple',
behaviors: [Polymer.IronA11yKeysBehavior],
properties: {
initialOpacity: {
type: Number,
value: 0.25
},
opacityDecayVelocity: {
type: Number,
value: 0.8
},
recenters: {
type: Boolean,
value: false
},
center: {
type: Boolean,
value: false
},
ripples: {
type: Array,
value: function () {
return [];
}
},
animating: {
type: Boolean,
readOnly: true,
reflectToAttribute: true,
value: false
},
holdDown: {
type: Boolean,
value: false,
observer: '_holdDownChanged'
},
noink: {
type: Boolean,
value: false
},
_animating: { type: Boolean },
_boundAnimate: {
type: Function,
value: function () {
return this.animate.bind(this);
}
}
},
get target() {
var ownerRoot = Polymer.dom(this).getOwnerRoot();
var target;
if (this.parentNode.nodeType == 11) {
target = ownerRoot.host;
} else {
target = this.parentNode;
}
return target;
},
keyBindings: {
'enter:keydown': '_onEnterKeydown',
'space:keydown': '_onSpaceKeydown',
'space:keyup': '_onSpaceKeyup'
},
attached: function () {
this.keyEventTarget = this.target;
this.listen(this.target, 'up', 'uiUpAction');
this.listen(this.target, 'down', 'uiDownAction');
},
detached: function () {
this.unlisten(this.target, 'up', 'uiUpAction');
this.unlisten(this.target, 'down', 'uiDownAction');
},
get shouldKeepAnimating() {
for (var index = 0; index < this.ripples.length; ++index) {
if (!this.ripples[index].isAnimationComplete) {
return true;
}
}
return false;
},
simulatedRipple: function () {
this.downAction(null);
this.async(function () {
this.upAction();
}, 1);
},
uiDownAction: function (event) {
if (!this.noink) {
this.downAction(event);
}
},
downAction: function (event) {
if (this.holdDown && this.ripples.length > 0) {
return;
}
var ripple = this.addRipple();
ripple.downAction(event);
if (!this._animating) {
this.animate();
}
},
uiUpAction: function (event) {
if (!this.noink) {
this.upAction(event);
}
},
upAction: function (event) {
if (this.holdDown) {
return;
}
this.ripples.forEach(function (ripple) {
ripple.upAction(event);
});
this.animate();
},
onAnimationComplete: function () {
this._animating = false;
this.$.background.style.backgroundColor = null;
this.fire('transitionend');
},
addRipple: function () {
var ripple = new Ripple(this);
Polymer.dom(this.$.waves).appendChild(ripple.waveContainer);
this.$.background.style.backgroundColor = ripple.color;
this.ripples.push(ripple);
this._setAnimating(true);
return ripple;
},
removeRipple: function (ripple) {
var rippleIndex = this.ripples.indexOf(ripple);
if (rippleIndex < 0) {
return;
}
this.ripples.splice(rippleIndex, 1);
ripple.remove();
if (!this.ripples.length) {
this._setAnimating(false);
}
},
animate: function () {
var index;
var ripple;
this._animating = true;
for (index = 0; index < this.ripples.length; ++index) {
ripple = this.ripples[index];
ripple.draw();
this.$.background.style.opacity = ripple.outerOpacity;
if (ripple.isOpacityFullyDecayed && !ripple.isRestingAtMaxRadius) {
this.removeRipple(ripple);
}
}
if (!this.shouldKeepAnimating && this.ripples.length === 0) {
this.onAnimationComplete();
} else {
window.requestAnimationFrame(this._boundAnimate);
}
},
_onEnterKeydown: function () {
this.uiDownAction();
this.async(this.uiUpAction, 1);
},
_onSpaceKeydown: function () {
this.uiDownAction();
},
_onSpaceKeyup: function () {
this.uiUpAction();
},
_holdDownChanged: function (newVal, oldVal) {
if (oldVal === undefined) {
return;
}
if (newVal) {
this.downAction();
} else {
this.upAction();
}
}
});
}());
(function () {
'use strict';
var SHADOW_WHEN_SCROLLING = 1;
var SHADOW_ALWAYS = 2;
var MODE_CONFIGS = {
outerScroll: { 'scroll': true },
shadowMode: {
'standard': SHADOW_ALWAYS,
'waterfall': SHADOW_WHEN_SCROLLING,
'waterfall-tall': SHADOW_WHEN_SCROLLING
},
tallMode: { 'waterfall-tall': true }
};
Polymer({
is: 'paper-header-panel',
properties: {
mode: {
type: String,
value: 'standard',
observer: '_modeChanged',
reflectToAttribute: true
},
shadow: {
type: Boolean,
value: false
},
tallClass: {
type: String,
value: 'tall'
},
atTop: {
type: Boolean,
value: true,
notify: true,
readOnly: true,
reflectToAttribute: true
}
},
observers: ['_computeDropShadowHidden(atTop, mode, shadow)'],
ready: function () {
this.scrollHandler = this._scroll.bind(this);
},
attached: function () {
this._addListener();
this._keepScrollingState();
},
detached: function () {
this._removeListener();
},
get header() {
return Polymer.dom(this.$.headerContent).getDistributedNodes()[0];
},
get scroller() {
return this._getScrollerForMode(this.mode);
},
get visibleShadow() {
return this.$.dropShadow.classList.contains('has-shadow');
},
_computeDropShadowHidden: function (atTop, mode, shadow) {
var shadowMode = MODE_CONFIGS.shadowMode[mode];
if (this.shadow) {
this.toggleClass('has-shadow', true, this.$.dropShadow);
} else if (shadowMode === SHADOW_ALWAYS) {
this.toggleClass('has-shadow', true, this.$.dropShadow);
} else if (shadowMode === SHADOW_WHEN_SCROLLING && !atTop) {
this.toggleClass('has-shadow', true, this.$.dropShadow);
} else {
this.toggleClass('has-shadow', false, this.$.dropShadow);
}
},
_computeMainContainerClass: function (mode) {
var classes = {};
classes['flex'] = mode !== 'cover';
return Object.keys(classes).filter(function (className) {
return classes[className];
}).join(' ');
},
_addListener: function () {
this.scroller.addEventListener('scroll', this.scrollHandler, false);
},
_removeListener: function () {
this.scroller.removeEventListener('scroll', this.scrollHandler);
},
_modeChanged: function (newMode, oldMode) {
var configs = MODE_CONFIGS;
var header = this.header;
var animateDuration = 200;
if (header) {
if (configs.tallMode[oldMode] && !configs.tallMode[newMode]) {
header.classList.remove(this.tallClass);
this.async(function () {
header.classList.remove('animate');
}, animateDuration);
} else {
header.classList.toggle('animate', configs.tallMode[newMode]);
}
}
this._keepScrollingState();
},
_keepScrollingState: function () {
var main = this.scroller;
var header = this.header;
this._setAtTop(main.scrollTop === 0);
if (header && this.tallClass && MODE_CONFIGS.tallMode[this.mode]) {
this.toggleClass(this.tallClass, this.atTop || header.classList.contains(this.tallClass) && main.scrollHeight < this.offsetHeight, header);
}
},
_scroll: function () {
this._keepScrollingState();
this.fire('content-scroll', { target: this.scroller }, { bubbles: false });
},
_getScrollerForMode: function (mode) {
return MODE_CONFIGS.outerScroll[mode] ? this : this.$.mainContainer;
}
});
}());
Polymer({
is: 'paper-toolbar',
hostAttributes: { 'role': 'toolbar' },
properties: {
bottomJustify: {
type: String,
value: ''
},
justify: {
type: String,
value: ''
},
middleJustify: {
type: String,
value: ''
}
},
attached: function () {
this._observer = this._observe(this);
this._updateAriaLabelledBy();
},
detached: function () {
if (this._observer) {
this._observer.disconnect();
}
},
_observe: function (node) {
var observer = new MutationObserver(function () {
this._updateAriaLabelledBy();
}.bind(this));
observer.observe(node, {
childList: true,
subtree: true
});
return observer;
},
_updateAriaLabelledBy: function () {
var labelledBy = [];
var contents = Polymer.dom(this.root).querySelectorAll('content');
for (var content, index = 0; content = contents[index]; index++) {
var nodes = Polymer.dom(content).getDistributedNodes();
for (var node, jndex = 0; node = nodes[jndex]; jndex++) {
if (node.classList && node.classList.contains('title')) {
if (node.id) {
labelledBy.push(node.id);
} else {
var id = 'paper-toolbar-label-' + Math.floor(Math.random() * 10000);
node.id = id;
labelledBy.push(id);
}
}
}
}
if (labelledBy.length > 0) {
this.setAttribute('aria-labelledby', labelledBy.join(' '));
}
},
_computeBarExtraClasses: function (barJustify) {
if (!barJustify)
return '';
return barJustify + (barJustify === 'justified' ? '' : '-justified');
}
});
Polymer({
is: 'paper-material',
properties: {
elevation: {
type: Number,
reflectToAttribute: true,
value: 1
},
animated: {
type: Boolean,
reflectToAttribute: true,
value: false
}
}
});
Polymer.IronControlState = {
properties: {
focused: {
type: Boolean,
value: false,
notify: true,
readOnly: true,
reflectToAttribute: true
},
disabled: {
type: Boolean,
value: false,
notify: true,
observer: '_disabledChanged',
reflectToAttribute: true
},
_oldTabIndex: { type: Number },
_boundFocusBlurHandler: {
type: Function,
value: function () {
return this._focusBlurHandler.bind(this);
}
}
},
observers: ['_changedControlState(focused, disabled)'],
ready: function () {
this.addEventListener('focus', this._boundFocusBlurHandler, true);
this.addEventListener('blur', this._boundFocusBlurHandler, true);
},
_focusBlurHandler: function (event) {
if (event.target === this) {
this._setFocused(event.type === 'focus');
} else if (!this.shadowRoot && !this.isLightDescendant(event.target)) {
this.fire(event.type, { sourceEvent: event }, {
node: this,
bubbles: event.bubbles,
cancelable: event.cancelable
});
}
},
_disabledChanged: function (disabled, old) {
this.setAttribute('aria-disabled', disabled ? 'true' : 'false');
this.style.pointerEvents = disabled ? 'none' : '';
if (disabled) {
this._oldTabIndex = this.tabIndex;
this.focused = false;
this.tabIndex = -1;
this.blur();
} else if (this._oldTabIndex !== undefined) {
this.tabIndex = this._oldTabIndex;
}
},
_changedControlState: function () {
if (this._controlStateChanged) {
this._controlStateChanged();
}
}
};
Polymer.IronButtonStateImpl = {
properties: {
pressed: {
type: Boolean,
readOnly: true,
value: false,
reflectToAttribute: true,
observer: '_pressedChanged'
},
toggles: {
type: Boolean,
value: false,
reflectToAttribute: true
},
active: {
type: Boolean,
value: false,
notify: true,
reflectToAttribute: true
},
pointerDown: {
type: Boolean,
readOnly: true,
value: false
},
receivedFocusFromKeyboard: {
type: Boolean,
readOnly: true
},
ariaActiveAttribute: {
type: String,
value: 'aria-pressed',
observer: '_ariaActiveAttributeChanged'
}
},
listeners: {
down: '_downHandler',
up: '_upHandler',
tap: '_tapHandler'
},
observers: [
'_detectKeyboardFocus(focused)',
'_activeChanged(active, ariaActiveAttribute)'
],
keyBindings: {
'enter:keydown': '_asyncClick',
'space:keydown': '_spaceKeyDownHandler',
'space:keyup': '_spaceKeyUpHandler'
},
_mouseEventRe: /^mouse/,
_tapHandler: function () {
if (this.toggles) {
this._userActivate(!this.active);
} else {
this.active = false;
}
},
_detectKeyboardFocus: function (focused) {
this._setReceivedFocusFromKeyboard(!this.pointerDown && focused);
},
_userActivate: function (active) {
if (this.active !== active) {
this.active = active;
this.fire('change');
}
},
_downHandler: function (event) {
this._setPointerDown(true);
this._setPressed(true);
this._setReceivedFocusFromKeyboard(false);
},
_upHandler: function () {
this._setPointerDown(false);
this._setPressed(false);
},
_spaceKeyDownHandler: function (event) {
var keyboardEvent = event.detail.keyboardEvent;
var target = Polymer.dom(keyboardEvent).localTarget;
if (this.isLightDescendant(target))
return;
keyboardEvent.preventDefault();
keyboardEvent.stopImmediatePropagation();
this._setPressed(true);
},
_spaceKeyUpHandler: function (event) {
var keyboardEvent = event.detail.keyboardEvent;
var target = Polymer.dom(keyboardEvent).localTarget;
if (this.isLightDescendant(target))
return;
if (this.pressed) {
this._asyncClick();
}
this._setPressed(false);
},
_asyncClick: function () {
this.async(function () {
this.click();
}, 1);
},
_pressedChanged: function (pressed) {
this._changedButtonState();
},
_ariaActiveAttributeChanged: function (value, oldValue) {
if (oldValue && oldValue != value && this.hasAttribute(oldValue)) {
this.removeAttribute(oldValue);
}
},
_activeChanged: function (active, ariaActiveAttribute) {
if (this.toggles) {
this.setAttribute(this.ariaActiveAttribute, active ? 'true' : 'false');
} else {
this.removeAttribute(this.ariaActiveAttribute);
}
this._changedButtonState();
},
_controlStateChanged: function () {
if (this.disabled) {
this._setPressed(false);
} else {
this._changedButtonState();
}
},
_changedButtonState: function () {
if (this._buttonStateChanged) {
this._buttonStateChanged();
}
}
};
Polymer.IronButtonState = [
Polymer.IronA11yKeysBehavior,
Polymer.IronButtonStateImpl
];
Polymer.PaperRippleBehavior = {
properties: {
noink: {
type: Boolean,
observer: '_noinkChanged'
},
_rippleContainer: { type: Object }
},
_buttonStateChanged: function () {
if (this.focused) {
this.ensureRipple();
}
},
_downHandler: function (event) {
Polymer.IronButtonStateImpl._downHandler.call(this, event);
if (this.pressed) {
this.ensureRipple(event);
}
},
ensureRipple: function (optTriggeringEvent) {
if (!this.hasRipple()) {
this._ripple = this._createRipple();
this._ripple.noink = this.noink;
var rippleContainer = this._rippleContainer || this.root;
if (rippleContainer) {
Polymer.dom(rippleContainer).appendChild(this._ripple);
}
if (optTriggeringEvent) {
var domContainer = Polymer.dom(this._rippleContainer || this);
var target = Polymer.dom(optTriggeringEvent).rootTarget;
if (domContainer.deepContains(target)) {
this._ripple.uiDownAction(optTriggeringEvent);
}
}
}
},
getRipple: function () {
this.ensureRipple();
return this._ripple;
},
hasRipple: function () {
return Boolean(this._ripple);
},
_createRipple: function () {
return document.createElement('paper-ripple');
},
_noinkChanged: function (noink) {
if (this.hasRipple()) {
this._ripple.noink = noink;
}
}
};
Polymer.PaperButtonBehaviorImpl = {
properties: {
elevation: {
type: Number,
reflectToAttribute: true,
readOnly: true
}
},
observers: [
'_calculateElevation(focused, disabled, active, pressed, receivedFocusFromKeyboard)',
'_computeKeyboardClass(receivedFocusFromKeyboard)'
],
hostAttributes: {
role: 'button',
tabindex: '0',
animated: true
},
_calculateElevation: function () {
var e = 1;
if (this.disabled) {
e = 0;
} else if (this.active || this.pressed) {
e = 4;
} else if (this.receivedFocusFromKeyboard) {
e = 3;
}
this._setElevation(e);
},
_computeKeyboardClass: function (receivedFocusFromKeyboard) {
this.toggleClass('keyboard-focus', receivedFocusFromKeyboard);
},
_spaceKeyDownHandler: function (event) {
Polymer.IronButtonStateImpl._spaceKeyDownHandler.call(this, event);
if (this.hasRipple() && this.getRipple().ripples.length < 1) {
this._ripple.uiDownAction();
}
},
_spaceKeyUpHandler: function (event) {
Polymer.IronButtonStateImpl._spaceKeyUpHandler.call(this, event);
if (this.hasRipple()) {
this._ripple.uiUpAction();
}
}
};
Polymer.PaperButtonBehavior = [
Polymer.IronButtonState,
Polymer.IronControlState,
Polymer.PaperRippleBehavior,
Polymer.PaperButtonBehaviorImpl
];
Polymer({
is: 'paper-button',
behaviors: [Polymer.PaperButtonBehavior],
properties: {
raised: {
type: Boolean,
reflectToAttribute: true,
value: false,
observer: '_calculateElevation'
}
},
_calculateElevation: function () {
if (!this.raised) {
this._setElevation(0);
} else {
Polymer.PaperButtonBehaviorImpl._calculateElevation.apply(this);
}
}
});
Polymer.PaperInkyFocusBehaviorImpl = {
observers: ['_focusedChanged(receivedFocusFromKeyboard)'],
_focusedChanged: function (receivedFocusFromKeyboard) {
if (receivedFocusFromKeyboard) {
this.ensureRipple();
}
if (this.hasRipple()) {
this._ripple.holdDown = receivedFocusFromKeyboard;
}
},
_createRipple: function () {
var ripple = Polymer.PaperRippleBehavior._createRipple();
ripple.id = 'ink';
ripple.setAttribute('center', '');
ripple.classList.add('circle');
return ripple;
}
};
Polymer.PaperInkyFocusBehavior = [
Polymer.IronButtonState,
Polymer.IronControlState,
Polymer.PaperRippleBehavior,
Polymer.PaperInkyFocusBehaviorImpl
];
Polymer({
is: 'paper-icon-button',
hostAttributes: {
role: 'button',
tabindex: '0'
},
behaviors: [Polymer.PaperInkyFocusBehavior],
properties: {
src: { type: String },
icon: { type: String },
alt: {
type: String,
observer: '_altChanged'
}
},
_altChanged: function (newValue, oldValue) {
var label = this.getAttribute('aria-label');
if (!label || oldValue == label) {
this.setAttribute('aria-label', newValue);
}
}
});
Polymer({
is: 'iron-localstorage',
properties: {
name: {
type: String,
value: ''
},
value: {
type: Object,
notify: true
},
useRaw: {
type: Boolean,
value: false
},
autoSaveDisabled: {
type: Boolean,
value: false
},
errorMessage: {
type: String,
notify: true
},
_loaded: {
type: Boolean,
value: false
}
},
observers: [
'_debounceReload(name,useRaw)',
'_trySaveValue(autoSaveDisabled)',
'_trySaveValue(value.*)'
],
ready: function () {
this._boundHandleStorage = this._handleStorage.bind(this);
},
attached: function () {
window.addEventListener('storage', this._boundHandleStorage);
},
detached: function () {
window.removeEventListener('storage', this._boundHandleStorage);
},
_handleStorage: function (ev) {
if (ev.key == this.name) {
this._load(true);
}
},
_trySaveValue: function () {
if (this._doNotSave) {
return;
}
if (this._loaded && !this.autoSaveDisabled) {
this.debounce('save', this.save);
}
},
_debounceReload: function () {
this.debounce('reload', this.reload);
},
reload: function () {
this._loaded = false;
this._load();
},
_load: function (externalChange) {
var v = window.localStorage.getItem(this.name);
if (v === null) {
this._loaded = true;
this._doNotSave = true;
this.value = null;
this._doNotSave = false;
this.fire('iron-localstorage-load-empty', { externalChange: externalChange });
} else {
if (!this.useRaw) {
try {
v = JSON.parse(v);
} catch (x) {
this.errorMessage = 'Could not parse local storage value';
console.error('could not parse local storage value', v);
v = null;
}
}
this._loaded = true;
this._doNotSave = true;
this.value = v;
this._doNotSave = false;
this.fire('iron-localstorage-load', { externalChange: externalChange });
}
},
save: function () {
var v = this.useRaw ? this.value : JSON.stringify(this.value);
try {
if (this.value === null || this.value === undefined) {
window.localStorage.removeItem(this.name);
} else {
window.localStorage.setItem(this.name, v);
}
} catch (ex) {
this.errorMessage = ex.message;
console.error('localStorage could not be saved. Safari incoginito mode?', ex);
}
}
});
(function () {
'use strict';
Polymer.IronJsonpLibraryBehavior = {
properties: {
libraryLoaded: {
type: Boolean,
value: false,
notify: true,
readOnly: true
},
libraryErrorMessage: {
type: String,
value: null,
notify: true,
readOnly: true
}
},
observers: ['_libraryUrlChanged(libraryUrl)'],
_libraryUrlChanged: function (libraryUrl) {
if (this._isReady && this.libraryUrl)
this._loadLibrary();
},
_libraryLoadCallback: function (err, result) {
if (err) {
console.warn('Library load failed:', err.message);
this._setLibraryErrorMessage(err.message);
} else {
this._setLibraryErrorMessage(null);
this._setLibraryLoaded(true);
if (this.notifyEvent)
this.fire(this.notifyEvent, result);
}
},
_loadLibrary: function () {
LoaderMap.require(this.libraryUrl, this._libraryLoadCallback.bind(this), this.callbackName);
},
ready: function () {
this._isReady = true;
if (this.libraryUrl)
this._loadLibrary();
}
};
var LoaderMap = {
apiMap: {},
require: function (url, notifyCallback, jsonpCallbackName) {
var name = this.nameFromUrl(url);
if (!this.apiMap[name])
this.apiMap[name] = new Loader(name, url, jsonpCallbackName);
this.apiMap[name].requestNotify(notifyCallback);
},
nameFromUrl: function (url) {
return url.replace(/[\:\/\%\?\&\.\=\-\,]/g, '_') + '_api';
}
};
var Loader = function (name, url, callbackName) {
this.notifiers = [];
if (!callbackName) {
if (url.indexOf(this.callbackMacro) >= 0) {
callbackName = name + '_loaded';
url = url.replace(this.callbackMacro, callbackName);
} else {
this.error = new Error('IronJsonpLibraryBehavior a %%callback%% parameter is required in libraryUrl');
return;
}
}
this.callbackName = callbackName;
window[this.callbackName] = this.success.bind(this);
this.addScript(url);
};
Loader.prototype = {
callbackMacro: '%%callback%%',
loaded: false,
addScript: function (src) {
var script = document.createElement('script');
script.src = src;
script.onerror = this.handleError.bind(this);
var s = document.querySelector('script') || document.body;
s.parentNode.insertBefore(script, s);
this.script = script;
},
removeScript: function () {
if (this.script.parentNode) {
this.script.parentNode.removeChild(this.script);
}
this.script = null;
},
handleError: function (ev) {
this.error = new Error('Library failed to load');
this.notifyAll();
this.cleanup();
},
success: function () {
this.loaded = true;
this.result = Array.prototype.slice.call(arguments);
this.notifyAll();
this.cleanup();
},
cleanup: function () {
delete window[this.callbackName];
},
notifyAll: function () {
this.notifiers.forEach(function (notifyCallback) {
notifyCallback(this.error, this.result);
}.bind(this));
this.notifiers = [];
},
requestNotify: function (notifyCallback) {
if (this.loaded || this.error) {
notifyCallback(this.error, this.result);
} else {
this.notifiers.push(notifyCallback);
}
}
};
}());
Polymer({
is: 'iron-jsonp-library',
behaviors: [Polymer.IronJsonpLibraryBehavior],
properties: {
libraryUrl: String,
callbackName: String,
notifyEvent: String
}
});
Polymer({
is: 'google-youtube-api',
behaviors: [Polymer.IronJsonpLibraryBehavior],
properties: {
libraryUrl: {
type: String,
value: 'https://www.youtube.com/iframe_api'
},
notifyEvent: {
type: String,
value: 'api-load'
},
callbackName: {
type: String,
value: 'onYouTubeIframeAPIReady'
}
},
get api() {
return YT;
}
});
Polymer({
is: 'google-youtube',
properties: {
videoId: {
type: String,
value: '',
observer: '_videoIdChanged'
},
playsupported: {
type: Boolean,
value: null,
notify: true
},
autoplay: {
type: Number,
value: 0
},
playbackstarted: {
type: Boolean,
value: false,
notify: true
},
height: {
type: String,
value: '270px'
},
width: {
type: String,
value: '480px'
},
state: {
type: Number,
value: -1,
notify: true
},
currenttime: {
type: Number,
value: 0,
notify: true
},
duration: {
type: Number,
value: 1,
notify: true
},
currenttimeformatted: {
type: String,
value: '0:00',
notify: true
},
durationformatted: {
type: String,
value: '0:00',
notify: true
},
fractionloaded: {
type: Number,
value: 0,
notify: true
},
chromeless: {
type: Boolean,
value: false
},
thumbnail: {
type: String,
value: ''
},
fluid: {
type: Boolean,
value: false
}
},
_computeContainerStyle: function (width, height) {
return 'width:' + width + '; height:' + height;
},
_useExistingPlaySupportedValue: function () {
this.playsupported = this._playsupportedLocalStorage;
},
_determinePlaySupported: function () {
if (this.playsupported == null) {
var timeout;
var videoElement = document.createElement('video');
if ('play' in videoElement) {
videoElement.id = 'playtest';
videoElement.style.position = 'absolute';
videoElement.style.top = '-9999px';
videoElement.style.left = '-9999px';
var mp4Source = document.createElement('source');
mp4Source.src = 'data:video/mp4;base64,AAAAFGZ0eXBNU05WAAACAE1TTlYAAAOUbW9vdgAAAGxtdmhkAAAAAM9ghv7PYIb+AAACWAAACu8AAQAAAQAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAnh0cmFrAAAAXHRraGQAAAAHz2CG/s9ghv4AAAABAAAAAAAACu8AAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAFAAAAA4AAAAAAHgbWRpYQAAACBtZGhkAAAAAM9ghv7PYIb+AAALuAAANq8AAAAAAAAAIWhkbHIAAAAAbWhscnZpZGVBVlMgAAAAAAABAB4AAAABl21pbmYAAAAUdm1oZAAAAAAAAAAAAAAAAAAAACRkaW5mAAAAHGRyZWYAAAAAAAAAAQAAAAx1cmwgAAAAAQAAAVdzdGJsAAAAp3N0c2QAAAAAAAAAAQAAAJdhdmMxAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAFAAOABIAAAASAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGP//AAAAEmNvbHJuY2xjAAEAAQABAAAAL2F2Y0MBTUAz/+EAGGdNQDOadCk/LgIgAAADACAAAAMA0eMGVAEABGjuPIAAAAAYc3R0cwAAAAAAAAABAAAADgAAA+gAAAAUc3RzcwAAAAAAAAABAAAAAQAAABxzdHNjAAAAAAAAAAEAAAABAAAADgAAAAEAAABMc3RzegAAAAAAAAAAAAAADgAAAE8AAAAOAAAADQAAAA0AAAANAAAADQAAAA0AAAANAAAADQAAAA0AAAANAAAADQAAAA4AAAAOAAAAFHN0Y28AAAAAAAAAAQAAA7AAAAA0dXVpZFVTTVQh0k/Ou4hpXPrJx0AAAAAcTVREVAABABIAAAAKVcQAAAAAAAEAAAAAAAAAqHV1aWRVU01UIdJPzruIaVz6ycdAAAAAkE1URFQABAAMAAAAC1XEAAACHAAeAAAABBXHAAEAQQBWAFMAIABNAGUAZABpAGEAAAAqAAAAASoOAAEAZABlAHQAZQBjAHQAXwBhAHUAdABvAHAAbABhAHkAAAAyAAAAA1XEAAEAMgAwADAANQBtAGUALwAwADcALwAwADYAMAA2ACAAMwA6ADUAOgAwAAABA21kYXQAAAAYZ01AM5p0KT8uAiAAAAMAIAAAAwDR4wZUAAAABGjuPIAAAAAnZYiAIAAR//eBLT+oL1eA2Nlb/edvwWZflzEVLlhlXtJvSAEGRA3ZAAAACkGaAQCyJ/8AFBAAAAAJQZoCATP/AOmBAAAACUGaAwGz/wDpgAAAAAlBmgQCM/8A6YEAAAAJQZoFArP/AOmBAAAACUGaBgMz/wDpgQAAAAlBmgcDs/8A6YEAAAAJQZoIBDP/AOmAAAAACUGaCQSz/wDpgAAAAAlBmgoFM/8A6YEAAAAJQZoLBbP/AOmAAAAACkGaDAYyJ/8AFBAAAAAKQZoNBrIv/4cMeQ==';
videoElement.appendChild(mp4Source);
var webmSource = document.createElement('source');
webmSource.src = 'data:video/webm;base64,GkXfo49CgoR3ZWJtQoeBAUKFgQEYU4BnAQAAAAAAF60RTZt0vE27jFOrhBVJqWZTrIIQA027jFOrhBZUrmtTrIIQbE27jFOrhBFNm3RTrIIXmU27jFOrhBxTu2tTrIIWs+xPvwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFUmpZuQq17GDD0JATYCjbGliZWJtbCB2MC43LjcgKyBsaWJtYXRyb3NrYSB2MC44LjFXQY9BVlNNYXRyb3NrYUZpbGVEiYRFnEAARGGIBc2Lz1QNtgBzpJCy3XZ0KNuKNZS4+fDpFxzUFlSua9iu1teBAXPFhL4G+bmDgQG5gQGIgQFVqoEAnIEAbeeBASMxT4Q/gAAAVe6BAIaFVl9WUDiqgQEj44OEE95DVSK1nIN1bmTgkbCBULqBPJqBAFSwgVBUuoE87EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB9DtnVB4eeBAKC4obaBAAAAkAMAnQEqUAA8AABHCIWFiIWEiAICAAamYnoOC6cfJa8f5Zvda4D+/7YOf//nNefQYACgnKGWgQFNANEBAAEQEAAYABhYL/QACIhgAPuC/rOgnKGWgQKbANEBAAEQEAAYABhYL/QACIhgAPuC/rKgnKGWgQPoANEBAAEQEAAYABhYL/QACIhgAPuC/rOgnKGWgQU1ANEBAAEQEAAYABhYL/QACIhgAPuC/rOgnKGWgQaDANEBAAEQEAAYABhYL/QACIhgAPuC/rKgnKGWgQfQANEBAAEQEAAYABhYL/QACIhgAPuC/rOgnKGWgQkdANEBAAEQEBRgAGFgv9AAIiGAAPuC/rOgnKGWgQprANEBAAEQEAAYABhYL/QACIhgAPuC/rKgnKGWgQu4ANEBAAEQEAAYABhYL/QACIhgAPuC/rOgnKGWgQ0FANEBAAEQEAAYABhYL/QACIhgAPuC/rOgnKGWgQ5TANEBAAEQEAAYABhYL/QACIhgAPuC/rKgnKGWgQ+gANEBAAEQEAAYABhYL/QACIhgAPuC/rOgnKGWgRDtANEBAAEQEAAYABhYL/QACIhgAPuC/rOgnKGWgRI7ANEBAAEQEAAYABhYL/QACIhgAPuC/rIcU7trQOC7jLOBALeH94EB8YIUzLuNs4IBTbeH94EB8YIUzLuNs4ICm7eH94EB8YIUzLuNs4ID6LeH94EB8YIUzLuNs4IFNbeH94EB8YIUzLuNs4IGg7eH94EB8YIUzLuNs4IH0LeH94EB8YIUzLuNs4IJHbeH94EB8YIUzLuNs4IKa7eH94EB8YIUzLuNs4ILuLeH94EB8YIUzLuNs4INBbeH94EB8YIUzLuNs4IOU7eH94EB8YIUzLuNs4IPoLeH94EB8YIUzLuNs4IQ7beH94EB8YIUzLuNs4ISO7eH94EB8YIUzBFNm3SPTbuMU6uEH0O2dVOsghTM';
videoElement.appendChild(webmSource);
document.body.appendChild(videoElement);
this.async(function () {
videoElement.onplaying = function (e) {
clearTimeout(timeout);
this.playsupported = e && e.type === 'playing' || videoElement.currentTime !== 0;
this._playsupportedLocalStorage = this.playsupported;
videoElement.onplaying = null;
document.body.removeChild(videoElement);
}.bind(this);
timeout = setTimeout(videoElement.onplaying, 500);
videoElement.play();
});
} else {
this.playsupported = false;
this._playsupportedLocalStorage = false;
}
}
},
ready: function () {
if (this.hasAttribute('fluid')) {
var ratio = parseInt(this.height, 10) / parseInt(this.width, 10);
if (isNaN(ratio)) {
ratio = 9 / 16;
}
ratio *= 100;
this.width = '100%';
this.height = 'auto';
this.$.container.style['padding-top'] = ratio + '%';
}
},
detached: function () {
if (this._player) {
this._player.destroy();
}
},
play: function () {
if (this._player && this._player.playVideo && this.playsupported) {
this._player.playVideo();
}
},
setVolume: function (volume) {
if (this._player && this._player.setVolume) {
this._player.setVolume(volume);
}
},
mute: function () {
if (this._player && this._player.mute) {
this._player.mute();
}
},
unMute: function () {
if (this._player && this._player.unMute) {
this._player.unMute();
}
},
pause: function () {
if (this._player && this._player.pauseVideo) {
this._player.pauseVideo();
}
},
seekTo: function (seconds) {
if (this._player && this._player.seekTo) {
this._player.seekTo(seconds, true);
this.async(function () {
this._updatePlaybackStats();
}, null, 100);
}
},
_videoIdChanged: function () {
this.currenttime = 0;
this.currenttimeformatted = this._toHHMMSS(0);
this.fractionloaded = 0;
this.duration = 1;
this.durationformatted = this._toHHMMSS(0);
if (!this._player || !this._player.cueVideoById) {
this._pendingVideoId = this.videoId;
} else {
if (this.playsupported && this.attributes['autoplay'] && this.attributes['autoplay'].value == '1') {
this._player.loadVideoById(this.videoId);
} else {
this._player.cueVideoById(this.videoId);
}
}
},
_player: null,
__updatePlaybackStatsInterval: null,
_pendingVideoId: '',
_apiLoad: function () {
var playerVars = {
playsinline: 1,
controls: 2,
autohide: 1,
autoplay: this.autoplay
};
if (this.chromeless) {
playerVars.controls = 0;
playerVars.modestbranding = 1;
playerVars.showinfo = 0;
playerVars.iv_load_policy = 3;
playerVars.rel = 0;
}
for (var i = 0; i < this.attributes.length; i++) {
var attribute = this.attributes[i];
playerVars[attribute.nodeName] = attribute.value;
}
this._player = new YT.Player(this.$.player, {
videoId: this.videoId,
width: '100%',
height: '100%',
playerVars: playerVars,
events: {
onReady: function (e) {
if (this._pendingVideoId && this._pendingVideoId != this.videoId) {
this._player.cueVideoById(this._pendingVideoId);
this._pendingVideoId = '';
}
this.fire('google-youtube-ready', e);
}.bind(this),
onStateChange: function (e) {
this.state = e.data;
if (this.state == 1) {
this.playbackstarted = true;
this.playsupported = true;
this.duration = this._player.getDuration();
this.durationformatted = this._toHHMMSS(this.duration);
if (!this.__updatePlaybackStatsInterval) {
this.__updatePlaybackStatsInterval = setInterval(this._updatePlaybackStats.bind(this), 1000);
}
} else {
if (this.__updatePlaybackStatsInterval) {
clearInterval(this.__updatePlaybackStatsInterval);
this.__updatePlaybackStatsInterval = null;
}
}
this.fire('google-youtube-state-change', e);
}.bind(this),
onError: function (e) {
this.state = 0;
this.fire('google-youtube-error', e);
}.bind(this)
}
});
},
_updatePlaybackStats: function () {
this.currenttime = Math.round(this._player.getCurrentTime());
this.currenttimeformatted = this._toHHMMSS(this.currenttime);
this.fractionloaded = this._player.getVideoLoadedFraction();
},
_toHHMMSS: function (totalSeconds) {
var hours = Math.floor(totalSeconds / 3600);
totalSeconds -= hours * 3600;
var minutes = Math.floor(totalSeconds / 60);
var seconds = Math.round(totalSeconds - minutes * 60);
var hourPortion = '';
if (hours > 0) {
hourPortion += hours + ':';
if (minutes < 10) {
minutes = '0' + minutes;
}
}
if (seconds < 10) {
seconds = '0' + seconds;
}
return hourPortion + minutes + ':' + seconds;
},
_handleThumbnailTap: function () {
this.autoplay = 1;
this.thumbnail = '';
}
});
;
(function () {
function t(t, n) {
return t.set(n[0], n[1]), t;
}
function n(t, n) {
return t.add(n), t;
}
function r(t, n, r) {
switch (r.length) {
case 0:
return t.call(n);
case 1:
return t.call(n, r[0]);
case 2:
return t.call(n, r[0], r[1]);
case 3:
return t.call(n, r[0], r[1], r[2]);
}
return t.apply(n, r);
}
function e(t, n, r, e) {
for (var u = -1, o = t.length; ++u < o;) {
var i = t[u];
n(e, i, r(i), t);
}
return e;
}
function u(t, n) {
for (var r = -1, e = t.length; ++r < e && false !== n(t[r], r, t););
return t;
}
function o(t, n) {
for (var r = -1, e = t.length; ++r < e;)
if (!n(t[r], r, t))
return false;
return true;
}
function i(t, n) {
for (var r = -1, e = t.length, u = 0, o = []; ++r < e;) {
var i = t[r];
n(i, r, t) && (o[u++] = i);
}
return o;
}
function f(t, n) {
return !!t.length && -1 < d(t, n, 0);
}
function c(t, n, r) {
for (var e = -1, u = t.length; ++e < u;)
if (r(n, t[e]))
return true;
return false;
}
function a(t, n) {
for (var r = -1, e = t.length, u = Array(e); ++r < e;)
u[r] = n(t[r], r, t);
return u;
}
function l(t, n) {
for (var r = -1, e = n.length, u = t.length; ++r < e;)
t[u + r] = n[r];
return t;
}
function s(t, n, r, e) {
var u = -1, o = t.length;
for (e && o && (r = t[++u]); ++u < o;)
r = n(r, t[u], u, t);
return r;
}
function h(t, n, r, e) {
var u = t.length;
for (e && u && (r = t[--u]); u--;)
r = n(r, t[u], u, t);
return r;
}
function p(t, n) {
for (var r = -1, e = t.length; ++r < e;)
if (n(t[r], r, t))
return true;
return false;
}
function _(t, n, r) {
for (var e = -1, u = t.length; ++e < u;) {
var o = t[e], i = n(o);
if (null != i && (f === T ? i === i : r(i, f)))
var f = i, c = o;
}
return c;
}
function v(t, n, r, e) {
var u;
return r(t, function (t, r, o) {
return n(t, r, o) ? (u = e ? r : t, false) : void 0;
}), u;
}
function g(t, n, r) {
for (var e = t.length, u = r ? e : -1; r ? u-- : ++u < e;)
if (n(t[u], u, t))
return u;
return -1;
}
function d(t, n, r) {
if (n !== n)
return U(t, r);
--r;
for (var e = t.length; ++r < e;)
if (t[r] === n)
return r;
return -1;
}
function y(t, n, r, e) {
--r;
for (var u = t.length; ++r < u;)
if (e(t[r], n))
return r;
return -1;
}
function b(t, n) {
var r = t ? t.length : 0;
return r ? m(t, n) / r : K;
}
function x(t, n, r, e, u) {
return u(t, function (t, u, o) {
r = e ? (e = false, t) : n(r, t, u, o);
}), r;
}
function j(t, n) {
var r = t.length;
for (t.sort(n); r--;)
t[r] = t[r].c;
return t;
}
function m(t, n) {
for (var r, e = -1, u = t.length; ++e < u;) {
var o = n(t[e]);
o !== T && (r = r === T ? o : r + o);
}
return r;
}
function w(t, n) {
for (var r = -1, e = Array(t); ++r < t;)
e[r] = n(r);
return e;
}
function A(t, n) {
return a(n, function (n) {
return [
n,
t[n]
];
});
}
function O(t) {
return function (n) {
return t(n);
};
}
function k(t, n) {
return a(n, function (n) {
return t[n];
});
}
function E(t, n) {
for (var r = -1, e = t.length; ++r < e && -1 < d(n, t[r], 0););
return r;
}
function I(t, n) {
for (var r = t.length; r-- && -1 < d(n, t[r], 0););
return r;
}
function S(t) {
return t && t.Object === Object ? t : null;
}
function R(t, n) {
if (t !== n) {
var r = null === t, e = t === T, u = t === t, o = null === n, i = n === T, f = n === n;
if (t > n && !o || !u || r && !i && f || e && f)
return 1;
if (n > t && !r || !f || o && !e && u || i && u)
return -1;
}
return 0;
}
function W(t) {
return function (n, r) {
var e;
return n === T && r === T ? 0 : (n !== T && (e = n), r !== T && (e = e === T ? r : t(e, r)), e);
};
}
function B(t) {
return Mt[t];
}
function C(t) {
return Lt[t];
}
function z(t) {
return '\\' + Ft[t];
}
function U(t, n, r) {
var e = t.length;
for (n += r ? 0 : -1; r ? n-- : ++n < e;) {
var u = t[n];
if (u !== u)
return n;
}
return -1;
}
function M(t) {
var n = false;
if (null != t && typeof t.toString != 'function')
try {
n = !!(t + '');
} catch (r) {
}
return n;
}
function L(t, n) {
return t = typeof t == 'number' || xt.test(t) ? +t : -1, t > -1 && 0 == t % 1 && (null == n ? 9007199254740991 : n) > t;
}
function $(t) {
for (var n, r = []; !(n = t.next()).done;)
r.push(n.value);
return r;
}
function D(t) {
var n = -1, r = Array(t.size);
return t.forEach(function (t, e) {
r[++n] = [
e,
t
];
}), r;
}
function F(t, n) {
for (var r = -1, e = t.length, u = 0, o = []; ++r < e;) {
var i = t[r];
i !== n && '__lodash_placeholder__' !== i || (t[r] = '__lodash_placeholder__', o[u++] = r);
}
return o;
}
function N(t) {
var n = -1, r = Array(t.size);
return t.forEach(function (t) {
r[++n] = t;
}), r;
}
function P(t) {
if (!t || !St.test(t))
return t.length;
for (var n = It.lastIndex = 0; It.test(t);)
n++;
return n;
}
function Z(t) {
return $t[t];
}
function q(S) {
function xt(t) {
if (Se(t) && !Qo(t) && !(t instanceof kt)) {
if (t instanceof Ot)
return t;
if (vu.call(t, '__wrapped__'))
return Jr(t);
}
return new Ot(t);
}
function At() {
}
function Ot(t, n) {
this.__wrapped__ = t, this.__actions__ = [], this.__chain__ = !!n, this.__index__ = 0, this.__values__ = T;
}
function kt(t) {
this.__wrapped__ = t, this.__actions__ = [], this.__dir__ = 1, this.__filtered__ = false, this.__iteratees__ = [], this.__takeCount__ = 4294967295, this.__views__ = [];
}
function Mt() {
}
function Lt(t) {
var n = -1, r = t ? t.length : 0;
for (this.clear(); ++n < r;) {
var e = t[n];
this.set(e[0], e[1]);
}
}
function $t(t) {
var n = -1, r = t ? t.length : 0;
for (this.__data__ = new Lt(); ++n < r;)
this.push(t[n]);
}
function Dt(t, n) {
var r = t.__data__;
return Pr(n) ? (r = r.__data__, '__lodash_hash_undefined__' === (typeof n == 'string' ? r.string : r.hash)[n]) : r.has(n);
}
function Ft(t) {
var n = -1, r = t ? t.length : 0;
for (this.clear(); ++n < r;) {
var e = t[n];
this.set(e[0], e[1]);
}
}
function Zt(t, n) {
var r = Vt(t, n);
return 0 > r ? false : (r == t.length - 1 ? t.pop() : Bu.call(t, r, 1), true);
}
function qt(t, n) {
var r = Vt(t, n);
return 0 > r ? T : t[r][1];
}
function Vt(t, n) {
for (var r = t.length; r--;)
if (be(t[r][0], n))
return r;
return -1;
}
function Kt(t, n, r) {
var e = Vt(t, n);
0 > e ? t.push([
n,
r
]) : t[e][1] = r;
}
function Gt(t, n, r, e) {
return t === T || be(t, pu[r]) && !vu.call(e, r) ? n : t;
}
function Ht(t, n, r) {
(r === T || be(t[n], r)) && (typeof n != 'number' || r !== T || n in t) || (t[n] = r);
}
function Qt(t, n, r) {
var e = t[n];
vu.call(t, n) && be(e, r) && (r !== T || n in t) || (t[n] = r);
}
function Xt(t, n, r, e) {
return fo(t, function (t, u, o) {
n(e, t, r(t), o);
}), e;
}
function tn(t, n) {
return t && ur(n, Ke(n), t);
}
function nn(t, n) {
for (var r = -1, e = null == t, u = n.length, o = Array(u); ++r < u;)
o[r] = e ? T : qe(t, n[r]);
return o;
}
function rn(t) {
return we(t) ? t : [];
}
function en(t) {
return typeof t == 'string' || Ue(t) ? t : t + '';
}
function un(t) {
return Qo(t) ? t : yo(t);
}
function on(t, n, r) {
return t === t && (r !== T && (t = t > r ? r : t), n !== T && (t = n > t ? n : t)), t;
}
function fn(t, n, r, e, o, i, f) {
var c;
if (e && (c = i ? e(t, o, i, f) : e(t)), c !== T)
return c;
if (!Ie(t))
return t;
if (o = Qo(t)) {
if (c = Mr(t), !n)
return er(t, c);
} else {
var a = zr(t), l = '[object Function]' == a || '[object GeneratorFunction]' == a;
if (Xo(t))
return Xn(t, n);
if ('[object Object]' == a || '[object Arguments]' == a || l && !i) {
if (M(t))
return i ? t : {};
if (c = Lr(l ? {} : t), !n)
return ir(t, tn(c, t));
} else {
if (!Ut[a])
return i ? t : {};
c = $r(t, a, fn, n);
}
}
if (f || (f = new Ft()), i = f.get(t))
return i;
if (f.set(t, c), !o)
var s = r ? bn(t, Ke, Cr) : Ke(t);
return u(s || t, function (u, o) {
s && (o = u, u = t[o]), Qt(c, o, fn(u, n, r, e, o, t, f));
}), c;
}
function cn(t) {
var n = Ke(t), r = n.length;
return function (e) {
if (null == e)
return !r;
for (var u = r; u--;) {
var o = n[u], i = t[o], f = e[o];
if (f === T && !(o in Object(e)) || !i(f))
return false;
}
return true;
};
}
function an(t) {
return Ie(t) ? Su(t) : {};
}
function ln(t, n, r) {
if (typeof t != 'function')
throw new su('Expected a function');
return Wu(function () {
t.apply(T, r);
}, n);
}
function sn(t, n, r, e) {
var u = -1, o = f, i = true, l = t.length, s = [], h = n.length;
if (!l)
return s;
r && (n = a(n, O(r))), e ? (o = c, i = false) : n.length >= 200 && (o = Dt, i = false, n = new $t(n));
t:
for (; ++u < l;) {
var p = t[u], _ = r ? r(p) : p;
if (i && _ === _) {
for (var v = h; v--;)
if (n[v] === _)
continue t;
s.push(p);
} else
o(n, _, e) || s.push(p);
}
return s;
}
function hn(t, n) {
var r = true;
return fo(t, function (t, e, u) {
return r = !!n(t, e, u);
}), r;
}
function pn(t, n) {
var r = [];
return fo(t, function (t, e, u) {
n(t, e, u) && r.push(t);
}), r;
}
function _n(t, n, r, e) {
e || (e = []);
for (var u = -1, o = t.length; ++u < o;) {
var i = t[u];
n > 0 && we(i) && (r || Qo(i) || je(i)) ? n > 1 ? _n(i, n - 1, r, e) : l(e, i) : r || (e[e.length] = i);
}
return e;
}
function vn(t, n) {
return t && ao(t, n, Ke);
}
function gn(t, n) {
return t && lo(t, n, Ke);
}
function dn(t, n) {
return i(n, function (n) {
return Oe(t[n]);
});
}
function yn(t, n) {
n = Nr(n, t) ? [n] : un(n);
for (var r = 0, e = n.length; null != t && e > r;)
t = t[n[r++]];
return r && r == e ? t : T;
}
function bn(t, n, r) {
return n = n(t), Qo(t) ? n : l(n, r(t));
}
function xn(t, n) {
return vu.call(t, n) || typeof t == 'object' && n in t && null === Uu(Object(t));
}
function jn(t, n) {
return n in Object(t);
}
function mn(t, n, r) {
for (var e = r ? c : f, u = t[0].length, o = t.length, i = o, l = Array(o), s = 1 / 0, h = []; i--;) {
var p = t[i];
i && n && (p = a(p, O(n))), s = Fu(p.length, s), l[i] = r || !n && (120 > u || 120 > p.length) ? T : new $t(i && p);
}
var p = t[0], _ = -1, v = l[0];
t:
for (; ++_ < u && s > h.length;) {
var g = p[_], d = n ? n(g) : g;
if (v ? !Dt(v, d) : !e(h, d, r)) {
for (i = o; --i;) {
var y = l[i];
if (y ? !Dt(y, d) : !e(t[i], d, r))
continue t;
}
v && v.push(d), h.push(g);
}
}
return h;
}
function wn(t, n, r) {
var e = {};
return vn(t, function (t, u, o) {
n(e, r(t), u, o);
}), e;
}
function An(t, n, e) {
return Nr(n, t) || (n = un(n), t = Kr(t, n), n = Xr(n)), n = null == t ? t : t[n], null == n ? T : r(n, t, e);
}
function On(t, n, r, e, u) {
if (t === n)
n = true;
else if (null == t || null == n || !Ie(t) && !Se(n))
n = t !== t && n !== n;
else
t: {
var o = Qo(t), i = Qo(n), f = '[object Array]', c = '[object Array]';
o || (f = zr(t), f = '[object Arguments]' == f ? '[object Object]' : f), i || (c = zr(n), c = '[object Arguments]' == c ? '[object Object]' : c);
var a = '[object Object]' == f && !M(t), i = '[object Object]' == c && !M(n);
if ((c = f == c) && !a)
u || (u = new Ft()), n = o || Me(t) ? kr(t, n, On, r, e, u) : Er(t, n, f, On, r, e, u);
else {
if (!(2 & e) && (o = a && vu.call(t, '__wrapped__'), f = i && vu.call(n, '__wrapped__'), o || f)) {
t = o ? t.value() : t, n = f ? n.value() : n, u || (u = new Ft()), n = On(t, n, r, e, u);
break t;
}
if (c)
n:
if (u || (u = new Ft()), o = 2 & e, f = Ke(t), i = f.length, c = Ke(n).length, i == c || o) {
for (a = i; a--;) {
var l = f[a];
if (!(o ? l in n : xn(n, l))) {
n = false;
break n;
}
}
if (c = u.get(t))
n = c == n;
else {
c = true, u.set(t, n);
for (var s = o; ++a < i;) {
var l = f[a], h = t[l], p = n[l];
if (r)
var _ = o ? r(p, h, l, n, t, u) : r(h, p, l, t, n, u);
if (_ === T ? h !== p && !On(h, p, r, e, u) : !_) {
c = false;
break;
}
s || (s = 'constructor' == l);
}
c && !s && (r = t.constructor, e = n.constructor, r != e && 'constructor' in t && 'constructor' in n && !(typeof r == 'function' && r instanceof r && typeof e == 'function' && e instanceof e) && (c = false)), u['delete'](t), n = c;
}
} else
n = false;
else
n = false;
}
}
return n;
}
function kn(t, n, r, e) {
var u = r.length, o = u, i = !e;
if (null == t)
return !o;
for (t = Object(t); u--;) {
var f = r[u];
if (i && f[2] ? f[1] !== t[f[0]] : !(f[0] in t))
return false;
}
for (; ++u < o;) {
var f = r[u], c = f[0], a = t[c], l = f[1];
if (i && f[2]) {
if (a === T && !(c in t))
return false;
} else {
if (f = new Ft(), e)
var s = e(a, l, c, t, n, f);
if (s === T ? !On(l, a, e, 3, f) : !s)
return false;
}
}
return true;
}
function En(t) {
return typeof t == 'function' ? t : null == t ? ru : typeof t == 'object' ? Qo(t) ? Wn(t[0], t[1]) : Rn(t) : iu(t);
}
function In(t) {
t = null == t ? t : Object(t);
var n, r = [];
for (n in t)
r.push(n);
return r;
}
function Sn(t, n) {
var r = -1, e = me(t) ? Array(t.length) : [];
return fo(t, function (t, u, o) {
e[++r] = n(t, u, o);
}), e;
}
function Rn(t) {
var n = Rr(t);
return 1 == n.length && n[0][2] ? Tr(n[0][0], n[0][1]) : function (r) {
return r === t || kn(r, t, n);
};
}
function Wn(t, n) {
return Nr(t) && n === n && !Ie(n) ? Tr(t, n) : function (r) {
var e = qe(r, t);
return e === T && e === n ? Ve(r, t) : On(n, e, T, 3);
};
}
function Bn(t, n, r, e, o) {
if (t !== n) {
if (!Qo(n) && !Me(n))
var i = Ge(n);
u(i || n, function (u, f) {
if (i && (f = u, u = n[f]), Ie(u)) {
o || (o = new Ft());
var c = f, a = o, l = t[c], s = n[c], h = a.get(s);
if (h)
Ht(t, c, h);
else {
var h = e ? e(l, s, c + '', t, n, a) : T, p = h === T;
p && (h = s, Qo(s) || Me(s) ? Qo(l) ? h = l : we(l) ? h = er(l) : (p = false, h = fn(s, true)) : Be(s) || je(s) ? je(l) ? h = Pe(l) : !Ie(l) || r && Oe(l) ? (p = false, h = fn(s, true)) : h = l : p = false), a.set(s, h), p && Bn(h, s, r, e, a), a['delete'](s), Ht(t, c, h);
}
} else
c = e ? e(t[f], u, f + '', t, n, o) : T, c === T && (c = u), Ht(t, f, c);
});
}
}
function Cn(t, n, r) {
var e = -1;
return n = a(n.length ? n : [ru], Sr()), t = Sn(t, function (t) {
return {
a: a(n, function (n) {
return n(t);
}),
b: ++e,
c: t
};
}), j(t, function (t, n) {
var e;
t: {
e = -1;
for (var u = t.a, o = n.a, i = u.length, f = r.length; ++e < i;) {
var c = R(u[e], o[e]);
if (c) {
e = f > e ? c * ('desc' == r[e] ? -1 : 1) : c;
break t;
}
}
e = t.b - n.b;
}
return e;
});
}
function zn(t, n) {
return t = Object(t), s(n, function (n, r) {
return r in t && (n[r] = t[r]), n;
}, {});
}
function Un(t, n) {
for (var r = -1, e = bn(t, Ge, vo), u = e.length, o = {}; ++r < u;) {
var i = e[r], f = t[i];
n(f, i) && (o[i] = f);
}
return o;
}
function Mn(t) {
return function (n) {
return null == n ? T : n[t];
};
}
function Ln(t) {
return function (n) {
return yn(n, t);
};
}
function $n(t, n, r, e) {
var u = e ? y : d, o = -1, i = n.length, f = t;
for (r && (f = a(t, O(r))); ++o < i;)
for (var c = 0, l = n[o], l = r ? r(l) : l; -1 < (c = u(f, l, c, e));)
f !== t && Bu.call(f, c, 1), Bu.call(t, c, 1);
return t;
}
function Dn(t, n) {
for (var r = t ? n.length : 0, e = r - 1; r--;) {
var u = n[r];
if (e == r || u != o) {
var o = u;
if (L(u))
Bu.call(t, u, 1);
else if (Nr(u, t))
delete t[u];
else {
var u = un(u), i = Kr(t, u);
null != i && delete i[Xr(u)];
}
}
}
}
function Fn(t, n) {
return t + zu(Pu() * (n - t + 1));
}
function Nn(t, n) {
var r = '';
if (!t || 1 > n || n > 9007199254740991)
return r;
do
n % 2 && (r += t), (n = zu(n / 2)) && (t += t);
while (n);
return r;
}
function Pn(t, n, r, e) {
n = Nr(n, t) ? [n] : un(n);
for (var u = -1, o = n.length, i = o - 1, f = t; null != f && ++u < o;) {
var c = n[u];
if (Ie(f)) {
var a = r;
if (u != i) {
var l = f[c], a = e ? e(l, c, f) : T;
a === T && (a = null == l ? L(n[u + 1]) ? [] : {} : l);
}
Qt(f, c, a);
}
f = f[c];
}
return t;
}
function Zn(t, n, r) {
var e = -1, u = t.length;
for (0 > n && (n = -n > u ? 0 : u + n), r = r > u ? u : r, 0 > r && (r += u), u = n > r ? 0 : r - n >>> 0, n >>>= 0, r = Array(u); ++e < u;)
r[e] = t[e + n];
return r;
}
function qn(t, n) {
var r;
return fo(t, function (t, e, u) {
return r = n(t, e, u), !r;
}), !!r;
}
function Tn(t, n, r) {
var e = 0, u = t ? t.length : e;
if (typeof n == 'number' && n === n && 2147483647 >= u) {
for (; u > e;) {
var o = e + u >>> 1, i = t[o];
(r ? n >= i : n > i) && null !== i ? e = o + 1 : u = o;
}
return u;
}
return Vn(t, n, ru, r);
}
function Vn(t, n, r, e) {
n = r(n);
for (var u = 0, o = t ? t.length : 0, i = n !== n, f = null === n, c = n === T; o > u;) {
var a = zu((u + o) / 2), l = r(t[a]), s = l !== T, h = l === l;
(i ? h || e : f ? h && s && (e || null != l) : c ? h && (e || s) : null == l ? 0 : e ? n >= l : n > l) ? u = a + 1 : o = a;
}
return Fu(o, 4294967294);
}
function Kn(t, n) {
for (var r = 0, e = t.length, u = t[0], o = n ? n(u) : u, i = o, f = 1, c = [u]; ++r < e;)
u = t[r], o = n ? n(u) : u, be(o, i) || (i = o, c[f++] = u);
return c;
}
function Gn(t, n, r) {
var e = -1, u = f, o = t.length, i = true, a = [], l = a;
if (r)
i = false, u = c;
else if (o < 200)
l = n ? [] : a;
else {
if (u = n ? null : ho(t))
return N(u);
i = false, u = Dt, l = new $t();
}
t:
for (; ++e < o;) {
var s = t[e], h = n ? n(s) : s;
if (i && h === h) {
for (var p = l.length; p--;)
if (l[p] === h)
continue t;
n && l.push(h), a.push(s);
} else
u(l, h, r) || (l !== a && l.push(h), a.push(s));
}
return a;
}
function Jn(t, n, r, e) {
for (var u = t.length, o = e ? u : -1; (e ? o-- : ++o < u) && n(t[o], o, t););
return r ? Zn(t, e ? 0 : o, e ? o + 1 : u) : Zn(t, e ? o + 1 : 0, e ? u : o);
}
function Yn(t, n) {
var r = t;
return r instanceof kt && (r = r.value()), s(n, function (t, n) {
return n.func.apply(n.thisArg, l([t], n.args));
}, r);
}
function Hn(t, n, r) {
for (var e = -1, u = t.length; ++e < u;)
var o = o ? l(sn(o, t[e], n, r), sn(t[e], o, n, r)) : t[e];
return o && o.length ? Gn(o, n, r) : [];
}
function Qn(t, n, r) {
for (var e = -1, u = t.length, o = n.length, i = {}; ++e < u;)
r(i, t[e], o > e ? n[e] : T);
return i;
}
function Xn(t, n) {
if (n)
return t.slice();
var r = new t.constructor(t.length);
return t.copy(r), r;
}
function tr(t) {
var n = new t.constructor(t.byteLength);
return new Au(n).set(new Au(t)), n;
}
function nr(t, n, r, e) {
var u = -1, o = t.length, i = r.length, f = -1, c = n.length, a = Du(o - i, 0), l = Array(c + a);
for (e = !e; ++f < c;)
l[f] = n[f];
for (; ++u < i;)
(e || o > u) && (l[r[u]] = t[u]);
for (; a--;)
l[f++] = t[u++];
return l;
}
function rr(t, n, r, e) {
var u = -1, o = t.length, i = -1, f = r.length, c = -1, a = n.length, l = Du(o - f, 0), s = Array(l + a);
for (e = !e; ++u < l;)
s[u] = t[u];
for (l = u; ++c < a;)
s[l + c] = n[c];
for (; ++i < f;)
(e || o > u) && (s[l + r[i]] = t[u++]);
return s;
}
function er(t, n) {
var r = -1, e = t.length;
for (n || (n = Array(e)); ++r < e;)
n[r] = t[r];
return n;
}
function ur(t, n, r) {
return or(t, n, r);
}
function or(t, n, r, e) {
r || (r = {});
for (var u = -1, o = n.length; ++u < o;) {
var i = n[u], f = e ? e(r[i], t[i], i, r, t) : t[i];
Qt(r, i, f);
}
return r;
}
function ir(t, n) {
return ur(t, Cr(t), n);
}
function fr(t, n) {
return function (r, u) {
var o = Qo(r) ? e : Xt, i = n ? n() : {};
return o(r, t, Sr(u), i);
};
}
function cr(t) {
return de(function (n, r) {
var e = -1, u = r.length, o = u > 1 ? r[u - 1] : T, i = u > 2 ? r[2] : T, o = typeof o == 'function' ? (u--, o) : T;
for (i && Fr(r[0], r[1], i) && (o = 3 > u ? T : o, u = 1), n = Object(n); ++e < u;)
(i = r[e]) && t(n, i, e, o);
return n;
});
}
function ar(t, n) {
return function (r, e) {
if (null == r)
return r;
if (!me(r))
return t(r, e);
for (var u = r.length, o = n ? u : -1, i = Object(r); (n ? o-- : ++o < u) && false !== e(i[o], o, i););
return r;
};
}
function lr(t) {
return function (n, r, e) {
var u = -1, o = Object(n);
e = e(n);
for (var i = e.length; i--;) {
var f = e[t ? i : ++u];
if (false === r(o[f], f, o))
break;
}
return n;
};
}
function sr(t, n, r) {
function e() {
return (this && this !== Jt && this instanceof e ? o : t).apply(u ? r : this, arguments);
}
var u = 1 & n, o = _r(t);
return e;
}
function hr(t) {
return function (n) {
n = Ze(n);
var r = St.test(n) ? n.match(It) : T, e = r ? r[0] : n.charAt(0);
return n = r ? r.slice(1).join('') : n.slice(1), e[t]() + n;
};
}
function pr(t) {
return function (n) {
return s(tu(Xe(n)), t, '');
};
}
function _r(t) {
return function () {
var n = arguments;
switch (n.length) {
case 0:
return new t();
case 1:
return new t(n[0]);
case 2:
return new t(n[0], n[1]);
case 3:
return new t(n[0], n[1], n[2]);
case 4:
return new t(n[0], n[1], n[2], n[3]);
case 5:
return new t(n[0], n[1], n[2], n[3], n[4]);
case 6:
return new t(n[0], n[1], n[2], n[3], n[4], n[5]);
case 7:
return new t(n[0], n[1], n[2], n[3], n[4], n[5], n[6]);
}
var r = an(t.prototype), n = t.apply(r, n);
return Ie(n) ? n : r;
};
}
function vr(t, n, e) {
function u() {
for (var i = arguments.length, f = Array(i), c = i, a = Br(u); c--;)
f[c] = arguments[c];
return c = 3 > i && f[0] !== a && f[i - 1] !== a ? [] : F(f, a), i -= c.length, e > i ? wr(t, n, dr, u.placeholder, T, f, c, T, T, e - i) : r(this && this !== Jt && this instanceof u ? o : t, this, f);
}
var o = _r(t);
return u;
}
function gr(t) {
return de(function (n) {
n = _n(n, 1);
var r = n.length, e = r, u = Ot.prototype.thru;
for (t && n.reverse(); e--;) {
var o = n[e];
if (typeof o != 'function')
throw new su('Expected a function');
if (u && !i && 'wrapper' == Ir(o))
var i = new Ot([], true);
}
for (e = i ? e : r; ++e < r;)
var o = n[e], u = Ir(o), f = 'wrapper' == u ? po(o) : T, i = f && Zr(f[0]) && 424 == f[1] && !f[4].length && 1 == f[9] ? i[Ir(f[0])].apply(i, f[3]) : 1 == o.length && Zr(o) ? i[u]() : i.thru(o);
return function () {
var t = arguments, e = t[0];
if (i && 1 == t.length && Qo(e) && e.length >= 200)
return i.plant(e).value();
for (var u = 0, t = r ? n[u].apply(this, t) : e; ++u < r;)
t = n[u].call(this, t);
return t;
};
});
}
function dr(t, n, r, e, u, o, i, f, c, a) {
function l() {
for (var d = arguments.length, y = d, b = Array(d); y--;)
b[y] = arguments[y];
if (_) {
var x, j = Br(l), y = b.length;
for (x = 0; y--;)
b[y] === j && x++;
}
if (e && (b = nr(b, e, u, _)), o && (b = rr(b, o, i, _)), d -= x, _ && a > d)
return j = F(b, j), wr(t, n, dr, l.placeholder, r, b, j, f, c, a - d);
if (j = h ? r : this, y = p ? j[t] : t, d = b.length, f) {
x = b.length;
for (var m = Fu(f.length, x), w = er(b); m--;) {
var A = f[m];
b[m] = L(A, x) ? w[A] : T;
}
} else
v && d > 1 && b.reverse();
return s && d > c && (b.length = c), this && this !== Jt && this instanceof l && (y = g || _r(y)), y.apply(j, b);
}
var s = 128 & n, h = 1 & n, p = 2 & n, _ = 24 & n, v = 512 & n, g = p ? T : _r(t);
return l;
}
function yr(t, n) {
return function (r, e) {
return wn(r, t, n(e));
};
}
function br(t) {
return de(function (n) {
return n = a(_n(n, 1), Sr()), de(function (e) {
var u = this;
return t(n, function (t) {
return r(t, u, e);
});
});
});
}
function xr(t, n) {
n = n === T ? ' ' : n + '';
var r = n.length;
return 2 > r ? r ? Nn(n, t) : n : (r = Nn(n, Cu(t / P(n))), St.test(n) ? r.match(It).slice(0, t).join('') : r.slice(0, t));
}
function jr(t, n, e, u) {
function o() {
for (var n = -1, c = arguments.length, a = -1, l = u.length, s = Array(l + c), h = this && this !== Jt && this instanceof o ? f : t; ++a < l;)
s[a] = u[a];
for (; c--;)
s[a++] = arguments[++n];
return r(h, i ? e : this, s);
}
var i = 1 & n, f = _r(t);
return o;
}
function mr(t) {
return function (n, r, e) {
e && typeof e != 'number' && Fr(n, r, e) && (r = e = T), n = Ne(n), n = n === n ? n : 0, r === T ? (r = n, n = 0) : r = Ne(r) || 0, e = e === T ? r > n ? 1 : -1 : Ne(e) || 0;
var u = -1;
r = Du(Cu((r - n) / (e || 1)), 0);
for (var o = Array(r); r--;)
o[t ? r : ++u] = n, n += e;
return o;
};
}
function wr(t, n, r, e, u, o, i, f, c, a) {
var l = 8 & n;
f = f ? er(f) : T;
var s = l ? i : T;
i = l ? T : i;
var h = l ? o : T;
return o = l ? T : o, n = (n | (l ? 32 : 64)) & ~(l ? 64 : 32), 4 & n || (n &= -4), n = [
t,
n,
u,
h,
s,
o,
i,
f,
c,
a
], r = r.apply(T, n), Zr(t) && go(r, n), r.placeholder = e, r;
}
function Ar(t) {
var n = au[t];
return function (t, r) {
if (t = Ne(t), r = De(r)) {
var e = (Ze(t) + 'e').split('e'), e = n(e[0] + 'e' + (+e[1] + r)), e = (Ze(e) + 'e').split('e');
return +(e[0] + 'e' + (+e[1] - r));
}
return n(t);
};
}
function Or(t, n, r, e, u, o, i, f) {
var c = 2 & n;
if (!c && typeof t != 'function')
throw new su('Expected a function');
var a = e ? e.length : 0;
if (a || (n &= -97, e = u = T), i = i === T ? i : Du(De(i), 0), f = f === T ? f : De(f), a -= u ? u.length : 0, 64 & n) {
var l = e, s = u;
e = u = T;
}
var h = c ? T : po(t);
return o = [
t,
n,
r,
e,
u,
l,
s,
o,
i,
f
], h && (r = o[1], t = h[1], n = r | t, e = 128 == t && 8 == r || 128 == t && 256 == r && h[8] >= o[7].length || 384 == t && h[8] >= h[7].length && 8 == r, 131 > n || e) && (1 & t && (o[2] = h[2], n |= 1 & r ? 0 : 4), (r = h[3]) && (e = o[3], o[3] = e ? nr(e, r, h[4]) : er(r), o[4] = e ? F(o[3], '__lodash_placeholder__') : er(h[4])), (r = h[5]) && (e = o[5], o[5] = e ? rr(e, r, h[6]) : er(r), o[6] = e ? F(o[5], '__lodash_placeholder__') : er(h[6])), (r = h[7]) && (o[7] = er(r)), 128 & t && (o[8] = null == o[8] ? h[8] : Fu(o[8], h[8])), null == o[9] && (o[9] = h[9]), o[0] = h[0], o[1] = n), t = o[0], n = o[1], r = o[2], e = o[3], u = o[4], f = o[9] = null == o[9] ? c ? 0 : t.length : Du(o[9] - a, 0), !f && 24 & n && (n &= -25), (h ? so : go)(n && 1 != n ? 8 == n || 16 == n ? vr(t, n, f) : 32 != n && 33 != n || u.length ? dr.apply(T, o) : jr(t, n, r, e) : sr(t, n, r), o);
}
function kr(t, n, r, e, u, o) {
var i = -1, f = 2 & u, c = 1 & u, a = t.length, l = n.length;
if (!(a == l || f && l > a))
return false;
if (l = o.get(t))
return l == n;
for (l = true, o.set(t, n); ++i < a;) {
var s = t[i], h = n[i];
if (e)
var _ = f ? e(h, s, i, n, t, o) : e(s, h, i, t, n, o);
if (_ !== T) {
if (_)
continue;
l = false;
break;
}
if (c) {
if (!p(n, function (t) {
return s === t || r(s, t, e, u, o);
})) {
l = false;
break;
}
} else if (s !== h && !r(s, h, e, u, o)) {
l = false;
break;
}
}
return o['delete'](t), l;
}
function Er(t, n, r, e, u, o, i) {
switch (r) {
case '[object DataView]':
if (t.byteLength != n.byteLength || t.byteOffset != n.byteOffset)
break;
t = t.buffer, n = n.buffer;
case '[object ArrayBuffer]':
if (t.byteLength != n.byteLength || !e(new Au(t), new Au(n)))
break;
return true;
case '[object Boolean]':
case '[object Date]':
return +t == +n;
case '[object Error]':
return t.name == n.name && t.message == n.message;
case '[object Number]':
return t != +t ? n != +n : t == +n;
case '[object RegExp]':
case '[object String]':
return t == n + '';
case '[object Map]':
var f = D;
case '[object Set]':
if (f || (f = N), t.size != n.size && !(2 & o))
break;
return (r = i.get(t)) ? r == n : (o |= 1, i.set(t, n), kr(f(t), f(n), e, u, o, i));
case '[object Symbol]':
if (oo)
return oo.call(t) == oo.call(n);
}
return false;
}
function Ir(t) {
for (var n = t.name + '', r = Qu[n], e = vu.call(Qu, n) ? r.length : 0; e--;) {
var u = r[e], o = u.func;
if (null == o || o == t)
return u.name;
}
return n;
}
function Sr() {
var t = xt.iteratee || eu, t = t === eu ? En : t;
return arguments.length ? t(arguments[0], arguments[1]) : t;
}
function Rr(t) {
t = Je(t);
for (var n = t.length; n--;) {
var r = t[n][1];
t[n][2] = r === r && !Ie(r);
}
return t;
}
function Wr(t, n) {
var r = t[n];
return Re(r) ? r : T;
}
function Br(t) {
return (vu.call(xt, 'placeholder') ? xt : t).placeholder;
}
function Cr(t) {
return Eu(Object(t));
}
function zr(t) {
return yu.call(t);
}
function Ur(t, n, r) {
n = Nr(n, t) ? [n] : un(n);
for (var e, u = -1, o = n.length; ++u < o;) {
var i = n[u];
if (!(e = null != t && r(t, i)))
break;
t = t[i];
}
return e ? e : (o = t ? t.length : 0, !!o && Ee(o) && L(i, o) && (Qo(t) || ze(t) || je(t)));
}
function Mr(t) {
var n = t.length, r = t.constructor(n);
return n && 'string' == typeof t[0] && vu.call(t, 'index') && (r.index = t.index, r.input = t.input), r;
}
function Lr(t) {
return typeof t.constructor != 'function' || qr(t) ? {} : an(Uu(Object(t)));
}
function $r(r, e, u, o) {
var i = r.constructor;
switch (e) {
case '[object ArrayBuffer]':
return tr(r);
case '[object Boolean]':
case '[object Date]':
return new i(+r);
case '[object DataView]':
return e = o ? tr(r.buffer) : r.buffer, new r.constructor(e, r.byteOffset, r.byteLength);
case '[object Float32Array]':
case '[object Float64Array]':
case '[object Int8Array]':
case '[object Int16Array]':
case '[object Int32Array]':
case '[object Uint8Array]':
case '[object Uint8ClampedArray]':
case '[object Uint16Array]':
case '[object Uint32Array]':
return e = o ? tr(r.buffer) : r.buffer, new r.constructor(e, r.byteOffset, r.length);
case '[object Map]':
return e = o ? u(D(r), true) : D(r), s(e, t, new r.constructor());
case '[object Number]':
case '[object String]':
return new i(r);
case '[object RegExp]':
return e = new r.constructor(r.source, _t.exec(r)), e.lastIndex = r.lastIndex, e;
case '[object Set]':
return e = o ? u(N(r), true) : N(r), s(e, n, new r.constructor());
case '[object Symbol]':
return oo ? Object(oo.call(r)) : {};
}
}
function Dr(t) {
var n = t ? t.length : T;
return Ee(n) && (Qo(t) || ze(t) || je(t)) ? w(n, String) : null;
}
function Fr(t, n, r) {
if (!Ie(r))
return false;
var e = typeof n;
return ('number' == e ? me(r) && L(n, r.length) : 'string' == e && n in r) ? be(r[n], t) : false;
}
function Nr(t, n) {
var r = typeof t;
return 'number' == r || 'symbol' == r ? true : !Qo(t) && (Ue(t) || ot.test(t) || !ut.test(t) || null != n && t in Object(n));
}
function Pr(t) {
var n = typeof t;
return 'number' == n || 'boolean' == n || 'string' == n && '__proto__' != t || null == t;
}
function Zr(t) {
var n = Ir(t), r = xt[n];
return typeof r == 'function' && n in kt.prototype ? t === r ? true : (n = po(r), !!n && t === n[0]) : false;
}
function qr(t) {
var n = t && t.constructor;
return t === (typeof n == 'function' && n.prototype || pu);
}
function Tr(t, n) {
return function (r) {
return null == r ? false : r[t] === n && (n !== T || t in Object(r));
};
}
function Vr(t, n, r, e, u, o) {
return Ie(t) && Ie(n) && Bn(t, n, T, Vr, o.set(n, t)), t;
}
function Kr(t, n) {
return 1 == n.length ? t : yn(t, Zn(n, 0, -1));
}
function Gr(t) {
if (Oe(t))
try {
return _u.call(t);
} catch (n) {
}
return Ze(t);
}
function Jr(t) {
if (t instanceof kt)
return t.clone();
var n = new Ot(t.__wrapped__, t.__chain__);
return n.__actions__ = er(t.__actions__), n.__index__ = t.__index__, n.__values__ = t.__values__, n;
}
function Yr(t, n, r) {
var e = t ? t.length : 0;
return e ? (n = r || n === T ? 1 : De(n), Zn(t, 0 > n ? 0 : n, e)) : [];
}
function Hr(t, n, r) {
var e = t ? t.length : 0;
return e ? (n = r || n === T ? 1 : De(n), n = e - n, Zn(t, 0, 0 > n ? 0 : n)) : [];
}
function Qr(t) {
return t ? t[0] : T;
}
function Xr(t) {
var n = t ? t.length : 0;
return n ? t[n - 1] : T;
}
function te(t, n) {
return t && t.length && n && n.length ? $n(t, n) : t;
}
function ne(t) {
return t ? Zu.call(t) : t;
}
function re(t) {
if (!t || !t.length)
return [];
var n = 0;
return t = i(t, function (t) {
return we(t) ? (n = Du(t.length, n), !0) : void 0;
}), w(n, function (n) {
return a(t, Mn(n));
});
}
function ee(t, n) {
if (!t || !t.length)
return [];
var e = re(t);
return null == n ? e : a(e, function (t) {
return r(n, T, t);
});
}
function ue(t) {
return t = xt(t), t.__chain__ = true, t;
}
function oe(t, n) {
return n(t);
}
function ie() {
return this;
}
function fe(t, n) {
return typeof n == 'function' && Qo(t) ? u(t, n) : fo(t, Sr(n));
}
function ce(t, n) {
var r;
if (typeof n == 'function' && Qo(t)) {
for (r = t.length; r-- && false !== n(t[r], r, t););
r = t;
} else
r = co(t, Sr(n));
return r;
}
function ae(t, n) {
return (Qo(t) ? a : Sn)(t, Sr(n, 3));
}
function le(t, n, r) {
var e = -1, u = $e(t), o = u.length, i = o - 1;
for (n = (r ? Fr(t, n, r) : n === T) ? 1 : on(De(n), 0, o); ++e < n;)
t = Fn(e, i), r = u[t], u[t] = u[e], u[e] = r;
return u.length = n, u;
}
function se(t, n, r) {
return n = r ? T : n, n = t && null == n ? t.length : n, Or(t, 128, T, T, T, T, n);
}
function he(t, n) {
var r;
if (typeof n != 'function')
throw new su('Expected a function');
return t = De(t), function () {
return 0 < --t && (r = n.apply(this, arguments)), 1 >= t && (n = T), r;
};
}
function pe(t, n, r) {
return n = r ? T : n, t = Or(t, 8, T, T, T, T, T, n), t.placeholder = pe.placeholder, t;
}
function _e(t, n, r) {
return n = r ? T : n, t = Or(t, 16, T, T, T, T, T, n), t.placeholder = _e.placeholder, t;
}
function ve(t, n, r) {
function e(n) {
var r = c, e = a;
return c = a = T, p = n, l = t.apply(e, r);
}
function u(t) {
var r = t - h;
return t -= p, !h || r >= n || 0 > r || false !== v && t >= v;
}
function o() {
var t = Zo();
if (u(t))
return i(t);
var r;
r = t - p, t = n - (t - h), r = false === v ? t : Fu(t, v - r), s = Wu(o, r);
}
function i(t) {
return Ou(s), s = T, g && c ? e(t) : (c = a = T, l);
}
function f() {
var t = Zo(), r = u(t);
return c = arguments, a = this, h = t, r ? s === T ? (p = t = h, s = Wu(o, n), _ ? e(t) : l) : (Ou(s), s = Wu(o, n), e(h)) : l;
}
var c, a, l, s, h = 0, p = 0, _ = false, v = false, g = true;
if (typeof t != 'function')
throw new su('Expected a function');
return n = Ne(n) || 0, Ie(r) && (_ = !!r.leading, v = 'maxWait' in r && Du(Ne(r.maxWait) || 0, n), g = 'trailing' in r ? !!r.trailing : g), f.cancel = function () {
s !== T && Ou(s), h = p = 0, c = a = s = T;
}, f.flush = function () {
return s === T ? l : i(Zo());
}, f;
}
function ge(t, n) {
function r() {
var e = arguments, u = n ? n.apply(this, e) : e[0], o = r.cache;
return o.has(u) ? o.get(u) : (e = t.apply(this, e), r.cache = o.set(u, e), e);
}
if (typeof t != 'function' || n && typeof n != 'function')
throw new su('Expected a function');
return r.cache = new (ge.Cache || Lt)(), r;
}
function de(t, n) {
if (typeof t != 'function')
throw new su('Expected a function');
return n = Du(n === T ? t.length - 1 : De(n), 0), function () {
for (var e = arguments, u = -1, o = Du(e.length - n, 0), i = Array(o); ++u < o;)
i[u] = e[n + u];
switch (n) {
case 0:
return t.call(this, i);
case 1:
return t.call(this, e[0], i);
case 2:
return t.call(this, e[0], e[1], i);
}
for (o = Array(n + 1), u = -1; ++u < n;)
o[u] = e[u];
return o[n] = i, r(t, this, o);
};
}
function ye() {
if (!arguments.length)
return [];
var t = arguments[0];
return Qo(t) ? t : [t];
}
function be(t, n) {
return t === n || t !== t && n !== n;
}
function xe(t, n) {
return t > n;
}
function je(t) {
return we(t) && vu.call(t, 'callee') && (!Ru.call(t, 'callee') || '[object Arguments]' == yu.call(t));
}
function me(t) {
return null != t && Ee(_o(t)) && !Oe(t);
}
function we(t) {
return Se(t) && me(t);
}
function Ae(t) {
return Se(t) ? '[object Error]' == yu.call(t) || typeof t.message == 'string' && typeof t.name == 'string' : false;
}
function Oe(t) {
return t = Ie(t) ? yu.call(t) : '', '[object Function]' == t || '[object GeneratorFunction]' == t;
}
function ke(t) {
return typeof t == 'number' && t == De(t);
}
function Ee(t) {
return typeof t == 'number' && t > -1 && 0 == t % 1 && 9007199254740991 >= t;
}
function Ie(t) {
var n = typeof t;
return !!t && ('object' == n || 'function' == n);
}
function Se(t) {
return !!t && typeof t == 'object';
}
function Re(t) {
return Ie(t) ? (Oe(t) || M(t) ? xu : yt).test(Gr(t)) : false;
}
function We(t) {
return typeof t == 'number' || Se(t) && '[object Number]' == yu.call(t);
}
function Be(t) {
return !Se(t) || '[object Object]' != yu.call(t) || M(t) ? false : (t = Uu(Object(t)), null === t ? true : (t = vu.call(t, 'constructor') && t.constructor, typeof t == 'function' && t instanceof t && _u.call(t) == du));
}
function Ce(t) {
return Ie(t) && '[object RegExp]' == yu.call(t);
}
function ze(t) {
return typeof t == 'string' || !Qo(t) && Se(t) && '[object String]' == yu.call(t);
}
function Ue(t) {
return typeof t == 'symbol' || Se(t) && '[object Symbol]' == yu.call(t);
}
function Me(t) {
return Se(t) && Ee(t.length) && !!zt[yu.call(t)];
}
function Le(t, n) {
return n > t;
}
function $e(t) {
if (!t)
return [];
if (me(t))
return ze(t) ? t.match(It) : er(t);
if (Iu && t[Iu])
return $(t[Iu]());
var n = zr(t);
return ('[object Map]' == n ? D : '[object Set]' == n ? N : He)(t);
}
function De(t) {
if (!t)
return 0 === t ? t : 0;
if (t = Ne(t), t === V || t === -V)
return 1.7976931348623157e+308 * (0 > t ? -1 : 1);
var n = t % 1;
return t === t ? n ? t - n : t : 0;
}
function Fe(t) {
return t ? on(De(t), 0, 4294967295) : 0;
}
function Ne(t) {
if (typeof t == 'number')
return t;
if (Ue(t))
return K;
if (Ie(t) && (t = Oe(t.valueOf) ? t.valueOf() : t, t = Ie(t) ? t + '' : t), typeof t != 'string')
return 0 === t ? t : +t;
t = t.replace(at, '');
var n = dt.test(t);
return n || bt.test(t) ? Pt(t.slice(2), n ? 2 : 8) : gt.test(t) ? K : +t;
}
function Pe(t) {
return ur(t, Ge(t));
}
function Ze(t) {
if (typeof t == 'string')
return t;
if (null == t)
return '';
if (Ue(t))
return io ? io.call(t) : '';
var n = t + '';
return '0' == n && 1 / t == -V ? '-0' : n;
}
function qe(t, n, r) {
return t = null == t ? T : yn(t, n), t === T ? r : t;
}
function Te(t, n) {
return null != t && Ur(t, n, xn);
}
function Ve(t, n) {
return null != t && Ur(t, n, jn);
}
function Ke(t) {
var n = qr(t);
if (!n && !me(t))
return $u(Object(t));
var r, e = Dr(t), u = !!e, e = e || [], o = e.length;
for (r in t)
!xn(t, r) || u && ('length' == r || L(r, o)) || n && 'constructor' == r || e.push(r);
return e;
}
function Ge(t) {
for (var n = -1, r = qr(t), e = In(t), u = e.length, o = Dr(t), i = !!o, o = o || [], f = o.length; ++n < u;) {
var c = e[n];
i && ('length' == c || L(c, f)) || 'constructor' == c && (r || !vu.call(t, c)) || o.push(c);
}
return o;
}
function Je(t) {
return A(t, Ke(t));
}
function Ye(t) {
return A(t, Ge(t));
}
function He(t) {
return t ? k(t, Ke(t)) : [];
}
function Qe(t) {
return ji(Ze(t).toLowerCase());
}
function Xe(t) {
return (t = Ze(t)) && t.replace(jt, B).replace(Et, '');
}
function tu(t, n, r) {
return t = Ze(t), n = r ? T : n, n === T && (n = Bt.test(t) ? Wt : Rt), t.match(n) || [];
}
function nu(t) {
return function () {
return t;
};
}
function ru(t) {
return t;
}
function eu(t) {
return En(typeof t == 'function' ? t : fn(t, true));
}
function uu(t, n, r) {
var e = Ke(n), o = dn(n, e);
null != r || Ie(n) && (o.length || !e.length) || (r = n, n = t, t = this, o = dn(n, Ke(n)));
var i = Ie(r) && 'chain' in r ? r.chain : true, f = Oe(t);
return u(o, function (r) {
var e = n[r];
t[r] = e, f && (t.prototype[r] = function () {
var n = this.__chain__;
if (i || n) {
var r = t(this.__wrapped__);
return (r.__actions__ = er(this.__actions__)).push({
func: e,
args: arguments,
thisArg: t
}), r.__chain__ = n, r;
}
return e.apply(t, l([this.value()], arguments));
});
}), t;
}
function ou() {
}
function iu(t) {
return Nr(t) ? Mn(t) : Ln(t);
}
S = S ? Yt.defaults({}, S, Yt.pick(Jt, Ct)) : Jt;
var fu = S.Date, cu = S.Error, au = S.Math, lu = S.RegExp, su = S.TypeError, hu = S.Array.prototype, pu = S.Object.prototype, _u = S.Function.prototype.toString, vu = pu.hasOwnProperty, gu = 0, du = _u.call(Object), yu = pu.toString, bu = Jt._, xu = lu('^' + _u.call(vu).replace(ft, '\\$&').replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'), ju = Tt ? S.Buffer : T, mu = S.Reflect, wu = S.Symbol, Au = S.Uint8Array, Ou = S.clearTimeout, ku = mu ? mu.f : T, Eu = Object.getOwnPropertySymbols, Iu = typeof (Iu = wu && wu.iterator) == 'symbol' ? Iu : T, Su = Object.create, Ru = pu.propertyIsEnumerable, Wu = S.setTimeout, Bu = hu.splice, Cu = au.ceil, zu = au.floor, Uu = Object.getPrototypeOf, Mu = S.isFinite, Lu = hu.join, $u = Object.keys, Du = au.max, Fu = au.min, Nu = S.parseInt, Pu = au.random, Zu = hu.reverse, qu = Wr(S, 'DataView'), Tu = Wr(S, 'Map'), Vu = Wr(S, 'Promise'), Ku = Wr(S, 'Set'), Gu = Wr(S, 'WeakMap'), Ju = Wr(Object, 'create'), Yu = Gu && new Gu(), Hu = !Ru.call({ valueOf: 1 }, 'valueOf'), Qu = {}, Xu = Gr(qu), to = Gr(Tu), no = Gr(Vu), ro = Gr(Ku), eo = Gr(Gu), uo = wu ? wu.prototype : T, oo = uo ? uo.valueOf : T, io = uo ? uo.toString : T;
xt.templateSettings = {
escape: nt,
evaluate: rt,
interpolate: et,
variable: '',
imports: { _: xt }
}, xt.prototype = At.prototype, xt.prototype.constructor = xt, Ot.prototype = an(At.prototype), Ot.prototype.constructor = Ot, kt.prototype = an(At.prototype), kt.prototype.constructor = kt, Mt.prototype = Ju ? Ju(null) : pu, Lt.prototype.clear = function () {
this.__data__ = {
hash: new Mt(),
map: Tu ? new Tu() : [],
string: new Mt()
};
}, Lt.prototype['delete'] = function (t) {
var n = this.__data__;
return Pr(t) ? (n = typeof t == 'string' ? n.string : n.hash, t = (Ju ? n[t] !== T : vu.call(n, t)) && delete n[t]) : t = Tu ? n.map['delete'](t) : Zt(n.map, t), t;
}, Lt.prototype.get = function (t) {
var n = this.__data__;
return Pr(t) ? (n = typeof t == 'string' ? n.string : n.hash, Ju ? (t = n[t], t = '__lodash_hash_undefined__' === t ? T : t) : t = vu.call(n, t) ? n[t] : T) : t = Tu ? n.map.get(t) : qt(n.map, t), t;
}, Lt.prototype.has = function (t) {
var n = this.__data__;
return Pr(t) ? (n = typeof t == 'string' ? n.string : n.hash, t = Ju ? n[t] !== T : vu.call(n, t)) : t = Tu ? n.map.has(t) : -1 < Vt(n.map, t), t;
}, Lt.prototype.set = function (t, n) {
var r = this.__data__;
return Pr(t) ? (typeof t == 'string' ? r.string : r.hash)[t] = Ju && n === T ? '__lodash_hash_undefined__' : n : Tu ? r.map.set(t, n) : Kt(r.map, t, n), this;
}, $t.prototype.push = function (t) {
var n = this.__data__;
Pr(t) ? (n = n.__data__, (typeof t == 'string' ? n.string : n.hash)[t] = '__lodash_hash_undefined__') : n.set(t, '__lodash_hash_undefined__');
}, Ft.prototype.clear = function () {
this.__data__ = {
array: [],
map: null
};
}, Ft.prototype['delete'] = function (t) {
var n = this.__data__, r = n.array;
return r ? Zt(r, t) : n.map['delete'](t);
}, Ft.prototype.get = function (t) {
var n = this.__data__, r = n.array;
return r ? qt(r, t) : n.map.get(t);
}, Ft.prototype.has = function (t) {
var n = this.__data__, r = n.array;
return r ? -1 < Vt(r, t) : n.map.has(t);
}, Ft.prototype.set = function (t, n) {
var r = this.__data__, e = r.array;
return e && (199 > e.length ? Kt(e, t, n) : (r.array = null, r.map = new Lt(e))), (r = r.map) && r.set(t, n), this;
};
var fo = ar(vn), co = ar(gn, true), ao = lr(), lo = lr(true);
ku && !Ru.call({ valueOf: 1 }, 'valueOf') && (In = function (t) {
return $(ku(t));
});
var so = Yu ? function (t, n) {
return Yu.set(t, n), t;
} : ru, ho = Ku && 2 === new Ku([
1,
2
]).size ? function (t) {
return new Ku(t);
} : ou, po = Yu ? function (t) {
return Yu.get(t);
} : ou, _o = Mn('length');
Eu || (Cr = function () {
return [];
});
var vo = Eu ? function (t) {
for (var n = []; t;)
l(n, Cr(t)), t = Uu(Object(t));
return n;
} : Cr;
(qu && '[object DataView]' != zr(new qu(new ArrayBuffer(1))) || Tu && '[object Map]' != zr(new Tu()) || Vu && '[object Promise]' != zr(Vu.resolve()) || Ku && '[object Set]' != zr(new Ku()) || Gu && '[object WeakMap]' != zr(new Gu())) && (zr = function (t) {
var n = yu.call(t);
if (t = Gr('[object Object]' == n ? t.constructor : null))
switch (t) {
case Xu:
return '[object DataView]';
case to:
return '[object Map]';
case no:
return '[object Promise]';
case ro:
return '[object Set]';
case eo:
return '[object WeakMap]';
}
return n;
});
var go = function () {
var t = 0, n = 0;
return function (r, e) {
var u = Zo(), o = 16 - (u - n);
if (n = u, o > 0) {
if (150 <= ++t)
return r;
} else
t = 0;
return so(r, e);
};
}(), yo = ge(function (t) {
var n = [];
return Ze(t).replace(it, function (t, r, e, u) {
n.push(e ? u.replace(ht, '$1') : r || t);
}), n;
}), bo = de(function (t, n) {
return we(t) ? sn(t, _n(n, 1, true)) : [];
}), xo = de(function (t, n) {
var r = Xr(n);
return we(r) && (r = T), we(t) ? sn(t, _n(n, 1, true), Sr(r)) : [];
}), jo = de(function (t, n) {
var r = Xr(n);
return we(r) && (r = T), we(t) ? sn(t, _n(n, 1, true), T, r) : [];
}), mo = de(function (t) {
var n = a(t, rn);
return n.length && n[0] === t[0] ? mn(n) : [];
}), wo = de(function (t) {
var n = Xr(t), r = a(t, rn);
return n === Xr(r) ? n = T : r.pop(), r.length && r[0] === t[0] ? mn(r, Sr(n)) : [];
}), Ao = de(function (t) {
var n = Xr(t), r = a(t, rn);
return n === Xr(r) ? n = T : r.pop(), r.length && r[0] === t[0] ? mn(r, T, n) : [];
}), Oo = de(te), ko = de(function (t, n) {
n = a(_n(n, 1), String);
var r = nn(t, n);
return Dn(t, n.sort(R)), r;
}), Eo = de(function (t) {
return Gn(_n(t, 1, true));
}), Io = de(function (t) {
var n = Xr(t);
return we(n) && (n = T), Gn(_n(t, 1, true), Sr(n));
}), So = de(function (t) {
var n = Xr(t);
return we(n) && (n = T), Gn(_n(t, 1, true), T, n);
}), Ro = de(function (t, n) {
return we(t) ? sn(t, n) : [];
}), Wo = de(function (t) {
return Hn(i(t, we));
}), Bo = de(function (t) {
var n = Xr(t);
return we(n) && (n = T), Hn(i(t, we), Sr(n));
}), Co = de(function (t) {
var n = Xr(t);
return we(n) && (n = T), Hn(i(t, we), T, n);
}), zo = de(re), Uo = de(function (t) {
var n = t.length, n = n > 1 ? t[n - 1] : T, n = typeof n == 'function' ? (t.pop(), n) : T;
return ee(t, n);
}), Mo = de(function (t) {
function n(n) {
return nn(n, t);
}
t = _n(t, 1);
var r = t.length, e = r ? t[0] : 0, u = this.__wrapped__;
return 1 >= r && !this.__actions__.length && u instanceof kt && L(e) ? (u = u.slice(e, +e + (r ? 1 : 0)), u.__actions__.push({
func: oe,
args: [n],
thisArg: T
}), new Ot(u, this.__chain__).thru(function (t) {
return r && !t.length && t.push(T), t;
})) : this.thru(n);
}), Lo = fr(function (t, n, r) {
vu.call(t, r) ? ++t[r] : t[r] = 1;
}), $o = fr(function (t, n, r) {
vu.call(t, r) ? t[r].push(n) : t[r] = [n];
}), Do = de(function (t, n, e) {
var u = -1, o = typeof n == 'function', i = Nr(n), f = me(t) ? Array(t.length) : [];
return fo(t, function (t) {
var c = o ? n : i && null != t ? t[n] : T;
f[++u] = c ? r(c, t, e) : An(t, n, e);
}), f;
}), Fo = fr(function (t, n, r) {
t[r] = n;
}), No = fr(function (t, n, r) {
t[r ? 0 : 1].push(n);
}, function () {
return [
[],
[]
];
}), Po = de(function (t, n) {
if (null == t)
return [];
var r = n.length;
return r > 1 && Fr(t, n[0], n[1]) ? n = [] : r > 2 && Fr(n[0], n[1], n[2]) && (n.length = 1), Cn(t, _n(n, 1), []);
}), Zo = fu.now, qo = de(function (t, n, r) {
var e = 1;
if (r.length)
var u = F(r, Br(qo)), e = 32 | e;
return Or(t, e, n, r, u);
}), To = de(function (t, n, r) {
var e = 3;
if (r.length)
var u = F(r, Br(To)), e = 32 | e;
return Or(n, e, t, r, u);
}), Vo = de(function (t, n) {
return ln(t, 1, n);
}), Ko = de(function (t, n, r) {
return ln(t, Ne(n) || 0, r);
});
ge.Cache = Lt;
var Go = de(function (t, n) {
n = a(_n(n, 1), Sr());
var e = n.length;
return de(function (u) {
for (var o = -1, i = Fu(u.length, e); ++o < i;)
u[o] = n[o].call(this, u[o]);
return r(t, this, u);
});
}), Jo = de(function (t, n) {
var r = F(n, Br(Jo));
return Or(t, 32, T, n, r);
}), Yo = de(function (t, n) {
var r = F(n, Br(Yo));
return Or(t, 64, T, n, r);
}), Ho = de(function (t, n) {
return Or(t, 256, T, T, T, _n(n, 1));
}), Qo = Array.isArray, Xo = ju ? function (t) {
return t instanceof ju;
} : nu(false), ti = cr(function (t, n) {
if (Hu || qr(n) || me(n))
ur(n, Ke(n), t);
else
for (var r in n)
vu.call(n, r) && Qt(t, r, n[r]);
}), ni = cr(function (t, n) {
if (Hu || qr(n) || me(n))
ur(n, Ge(n), t);
else
for (var r in n)
Qt(t, r, n[r]);
}), ri = cr(function (t, n, r, e) {
or(n, Ge(n), t, e);
}), ei = cr(function (t, n, r, e) {
or(n, Ke(n), t, e);
}), ui = de(function (t, n) {
return nn(t, _n(n, 1));
}), oi = de(function (t) {
return t.push(T, Gt), r(ri, T, t);
}), ii = de(function (t) {
return t.push(T, Vr), r(si, T, t);
}), fi = yr(function (t, n, r) {
t[n] = r;
}, nu(ru)), ci = yr(function (t, n, r) {
vu.call(t, n) ? t[n].push(r) : t[n] = [r];
}, Sr), ai = de(An), li = cr(function (t, n, r) {
Bn(t, n, r);
}), si = cr(function (t, n, r, e) {
Bn(t, n, r, e);
}), hi = de(function (t, n) {
return null == t ? {} : (n = a(_n(n, 1), en), zn(t, sn(bn(t, Ge, vo), n)));
}), pi = de(function (t, n) {
return null == t ? {} : zn(t, _n(n, 1));
}), _i = pr(function (t, n, r) {
return n = n.toLowerCase(), t + (r ? Qe(n) : n);
}), vi = pr(function (t, n, r) {
return t + (r ? '-' : '') + n.toLowerCase();
}), gi = pr(function (t, n, r) {
return t + (r ? ' ' : '') + n.toLowerCase();
}), di = hr('toLowerCase'), yi = pr(function (t, n, r) {
return t + (r ? '_' : '') + n.toLowerCase();
}), bi = pr(function (t, n, r) {
return t + (r ? ' ' : '') + ji(n);
}), xi = pr(function (t, n, r) {
return t + (r ? ' ' : '') + n.toUpperCase();
}), ji = hr('toUpperCase'), mi = de(function (t, n) {
try {
return r(t, T, n);
} catch (e) {
return Ae(e) ? e : new cu(e);
}
}), wi = de(function (t, n) {
return u(_n(n, 1), function (n) {
t[n] = qo(t[n], t);
}), t;
}), Ai = gr(), Oi = gr(true), ki = de(function (t, n) {
return function (r) {
return An(r, t, n);
};
}), Ei = de(function (t, n) {
return function (r) {
return An(t, r, n);
};
}), Ii = br(a), Si = br(o), Ri = br(p), Wi = mr(), Bi = mr(true), Ci = W(function (t, n) {
return t + n;
}), zi = Ar('ceil'), Ui = W(function (t, n) {
return t / n;
}), Mi = Ar('floor'), Li = W(function (t, n) {
return t * n;
}), $i = Ar('round'), Di = W(function (t, n) {
return t - n;
});
return xt.after = function (t, n) {
if (typeof n != 'function')
throw new su('Expected a function');
return t = De(t), function () {
return 1 > --t ? n.apply(this, arguments) : void 0;
};
}, xt.ary = se, xt.assign = ti, xt.assignIn = ni, xt.assignInWith = ri, xt.assignWith = ei, xt.at = ui, xt.before = he, xt.bind = qo, xt.bindAll = wi, xt.bindKey = To, xt.castArray = ye, xt.chain = ue, xt.chunk = function (t, n, r) {
if (n = (r ? Fr(t, n, r) : n === T) ? 1 : Du(De(n), 0), r = t ? t.length : 0, !r || 1 > n)
return [];
for (var e = 0, u = 0, o = Array(Cu(r / n)); r > e;)
o[u++] = Zn(t, e, e += n);
return o;
}, xt.compact = function (t) {
for (var n = -1, r = t ? t.length : 0, e = 0, u = []; ++n < r;) {
var o = t[n];
o && (u[e++] = o);
}
return u;
}, xt.concat = function () {
var t = arguments.length, n = ye(arguments[0]);
if (2 > t)
return t ? er(n) : [];
for (var r = Array(t - 1); t--;)
r[t - 1] = arguments[t];
for (var t = _n(r, 1), r = -1, e = n.length, u = -1, o = t.length, i = Array(e + o); ++r < e;)
i[r] = n[r];
for (; ++u < o;)
i[r++] = t[u];
return i;
}, xt.cond = function (t) {
var n = t ? t.length : 0, e = Sr();
return t = n ? a(t, function (t) {
if ('function' != typeof t[1])
throw new su('Expected a function');
return [
e(t[0]),
t[1]
];
}) : [], de(function (e) {
for (var u = -1; ++u < n;) {
var o = t[u];
if (r(o[0], this, e))
return r(o[1], this, e);
}
});
}, xt.conforms = function (t) {
return cn(fn(t, true));
}, xt.constant = nu, xt.countBy = Lo, xt.create = function (t, n) {
var r = an(t);
return n ? tn(r, n) : r;
}, xt.curry = pe, xt.curryRight = _e, xt.debounce = ve, xt.defaults = oi, xt.defaultsDeep = ii, xt.defer = Vo, xt.delay = Ko, xt.difference = bo, xt.differenceBy = xo, xt.differenceWith = jo, xt.drop = Yr, xt.dropRight = Hr, xt.dropRightWhile = function (t, n) {
return t && t.length ? Jn(t, Sr(n, 3), true, true) : [];
}, xt.dropWhile = function (t, n) {
return t && t.length ? Jn(t, Sr(n, 3), true) : [];
}, xt.fill = function (t, n, r, e) {
var u = t ? t.length : 0;
if (!u)
return [];
for (r && typeof r != 'number' && Fr(t, n, r) && (r = 0, e = u), u = t.length, r = De(r), 0 > r && (r = -r > u ? 0 : u + r), e = e === T || e > u ? u : De(e), 0 > e && (e += u), e = r > e ? 0 : Fe(e); e > r;)
t[r++] = n;
return t;
}, xt.filter = function (t, n) {
return (Qo(t) ? i : pn)(t, Sr(n, 3));
}, xt.flatMap = function (t, n) {
return _n(ae(t, n), 1);
}, xt.flatMapDeep = function (t, n) {
return _n(ae(t, n), V);
}, xt.flatMapDepth = function (t, n, r) {
return r = r === T ? 1 : De(r), _n(ae(t, n), r);
}, xt.flatten = function (t) {
return t && t.length ? _n(t, 1) : [];
}, xt.flattenDeep = function (t) {
return t && t.length ? _n(t, V) : [];
}, xt.flattenDepth = function (t, n) {
return t && t.length ? (n = n === T ? 1 : De(n), _n(t, n)) : [];
}, xt.flip = function (t) {
return Or(t, 512);
}, xt.flow = Ai, xt.flowRight = Oi, xt.fromPairs = function (t) {
for (var n = -1, r = t ? t.length : 0, e = {}; ++n < r;) {
var u = t[n];
e[u[0]] = u[1];
}
return e;
}, xt.functions = function (t) {
return null == t ? [] : dn(t, Ke(t));
}, xt.functionsIn = function (t) {
return null == t ? [] : dn(t, Ge(t));
}, xt.groupBy = $o, xt.initial = function (t) {
return Hr(t, 1);
}, xt.intersection = mo, xt.intersectionBy = wo, xt.intersectionWith = Ao, xt.invert = fi, xt.invertBy = ci, xt.invokeMap = Do, xt.iteratee = eu, xt.keyBy = Fo, xt.keys = Ke, xt.keysIn = Ge, xt.map = ae, xt.mapKeys = function (t, n) {
var r = {};
return n = Sr(n, 3), vn(t, function (t, e, u) {
r[n(t, e, u)] = t;
}), r;
}, xt.mapValues = function (t, n) {
var r = {};
return n = Sr(n, 3), vn(t, function (t, e, u) {
r[e] = n(t, e, u);
}), r;
}, xt.matches = function (t) {
return Rn(fn(t, true));
}, xt.matchesProperty = function (t, n) {
return Wn(t, fn(n, true));
}, xt.memoize = ge, xt.merge = li, xt.mergeWith = si, xt.method = ki, xt.methodOf = Ei, xt.mixin = uu, xt.negate = function (t) {
if (typeof t != 'function')
throw new su('Expected a function');
return function () {
return !t.apply(this, arguments);
};
}, xt.nthArg = function (t) {
return t = De(t), function () {
return arguments[t];
};
}, xt.omit = hi, xt.omitBy = function (t, n) {
return n = Sr(n), Un(t, function (t, r) {
return !n(t, r);
});
}, xt.once = function (t) {
return he(2, t);
}, xt.orderBy = function (t, n, r, e) {
return null == t ? [] : (Qo(n) || (n = null == n ? [] : [n]), r = e ? T : r, Qo(r) || (r = null == r ? [] : [r]), Cn(t, n, r));
}, xt.over = Ii, xt.overArgs = Go, xt.overEvery = Si, xt.overSome = Ri, xt.partial = Jo, xt.partialRight = Yo, xt.partition = No, xt.pick = pi, xt.pickBy = function (t, n) {
return null == t ? {} : Un(t, Sr(n));
}, xt.property = iu, xt.propertyOf = function (t) {
return function (n) {
return null == t ? T : yn(t, n);
};
}, xt.pull = Oo, xt.pullAll = te, xt.pullAllBy = function (t, n, r) {
return t && t.length && n && n.length ? $n(t, n, Sr(r)) : t;
}, xt.pullAllWith = function (t, n, r) {
return t && t.length && n && n.length ? $n(t, n, T, r) : t;
}, xt.pullAt = ko, xt.range = Wi, xt.rangeRight = Bi, xt.rearg = Ho, xt.reject = function (t, n) {
var r = Qo(t) ? i : pn;
return n = Sr(n, 3), r(t, function (t, r, e) {
return !n(t, r, e);
});
}, xt.remove = function (t, n) {
var r = [];
if (!t || !t.length)
return r;
var e = -1, u = [], o = t.length;
for (n = Sr(n, 3); ++e < o;) {
var i = t[e];
n(i, e, t) && (r.push(i), u.push(e));
}
return Dn(t, u), r;
}, xt.rest = de, xt.reverse = ne, xt.sampleSize = le, xt.set = function (t, n, r) {
return null == t ? t : Pn(t, n, r);
}, xt.setWith = function (t, n, r, e) {
return e = typeof e == 'function' ? e : T, null == t ? t : Pn(t, n, r, e);
}, xt.shuffle = function (t) {
return le(t, 4294967295);
}, xt.slice = function (t, n, r) {
var e = t ? t.length : 0;
return e ? (r && typeof r != 'number' && Fr(t, n, r) ? (n = 0, r = e) : (n = null == n ? 0 : De(n), r = r === T ? e : De(r)), Zn(t, n, r)) : [];
}, xt.sortBy = Po, xt.sortedUniq = function (t) {
return t && t.length ? Kn(t) : [];
}, xt.sortedUniqBy = function (t, n) {
return t && t.length ? Kn(t, Sr(n)) : [];
}, xt.split = function (t, n, r) {
return Ze(t).split(n, r);
}, xt.spread = function (t, n) {
if (typeof t != 'function')
throw new su('Expected a function');
return n = n === T ? 0 : Du(De(n), 0), de(function (e) {
var u = e[n];
return e = e.slice(0, n), u && l(e, u), r(t, this, e);
});
}, xt.tail = function (t) {
return Yr(t, 1);
}, xt.take = function (t, n, r) {
return t && t.length ? (n = r || n === T ? 1 : De(n), Zn(t, 0, 0 > n ? 0 : n)) : [];
}, xt.takeRight = function (t, n, r) {
var e = t ? t.length : 0;
return e ? (n = r || n === T ? 1 : De(n), n = e - n, Zn(t, 0 > n ? 0 : n, e)) : [];
}, xt.takeRightWhile = function (t, n) {
return t && t.length ? Jn(t, Sr(n, 3), false, true) : [];
}, xt.takeWhile = function (t, n) {
return t && t.length ? Jn(t, Sr(n, 3)) : [];
}, xt.tap = function (t, n) {
return n(t), t;
}, xt.throttle = function (t, n, r) {
var e = true, u = true;
if (typeof t != 'function')
throw new su('Expected a function');
return Ie(r) && (e = 'leading' in r ? !!r.leading : e, u = 'trailing' in r ? !!r.trailing : u), ve(t, n, {
leading: e,
maxWait: n,
trailing: u
});
}, xt.thru = oe, xt.toArray = $e, xt.toPairs = Je, xt.toPairsIn = Ye, xt.toPath = function (t) {
return Qo(t) ? a(t, en) : Ue(t) ? [t] : er(yo(t));
}, xt.toPlainObject = Pe, xt.transform = function (t, n, r) {
var e = Qo(t) || Me(t);
if (n = Sr(n, 4), null == r)
if (e || Ie(t)) {
var o = t.constructor;
r = e ? Qo(t) ? new o() : [] : Oe(o) ? an(Uu(Object(t))) : {};
} else
r = {};
return (e ? u : vn)(t, function (t, e, u) {
return n(r, t, e, u);
}), r;
}, xt.unary = function (t) {
return se(t, 1);
}, xt.union = Eo, xt.unionBy = Io, xt.unionWith = So, xt.uniq = function (t) {
return t && t.length ? Gn(t) : [];
}, xt.uniqBy = function (t, n) {
return t && t.length ? Gn(t, Sr(n)) : [];
}, xt.uniqWith = function (t, n) {
return t && t.length ? Gn(t, T, n) : [];
}, xt.unset = function (t, n) {
var r;
if (null == t)
r = true;
else {
r = t;
var e = n, e = Nr(e, r) ? [e] : un(e);
r = Kr(r, e), e = Xr(e), r = null != r && Te(r, e) ? delete r[e] : true;
}
return r;
}, xt.unzip = re, xt.unzipWith = ee, xt.update = function (t, n, r) {
return null == t ? t : Pn(t, n, (typeof r == 'function' ? r : ru)(yn(t, n)), void 0);
}, xt.updateWith = function (t, n, r, e) {
return e = typeof e == 'function' ? e : T, null != t && (t = Pn(t, n, (typeof r == 'function' ? r : ru)(yn(t, n)), e)), t;
}, xt.values = He, xt.valuesIn = function (t) {
return null == t ? [] : k(t, Ge(t));
}, xt.without = Ro, xt.words = tu, xt.wrap = function (t, n) {
return n = null == n ? ru : n, Jo(n, t);
}, xt.xor = Wo, xt.xorBy = Bo, xt.xorWith = Co, xt.zip = zo, xt.zipObject = function (t, n) {
return Qn(t || [], n || [], Qt);
}, xt.zipObjectDeep = function (t, n) {
return Qn(t || [], n || [], Pn);
}, xt.zipWith = Uo, xt.entries = Je, xt.entriesIn = Ye, xt.extend = ni, xt.extendWith = ri, uu(xt, xt), xt.add = Ci, xt.attempt = mi, xt.camelCase = _i, xt.capitalize = Qe, xt.ceil = zi, xt.clamp = function (t, n, r) {
return r === T && (r = n, n = T), r !== T && (r = Ne(r), r = r === r ? r : 0), n !== T && (n = Ne(n), n = n === n ? n : 0), on(Ne(t), n, r);
}, xt.clone = function (t) {
return fn(t, false, true);
}, xt.cloneDeep = function (t) {
return fn(t, true, true);
}, xt.cloneDeepWith = function (t, n) {
return fn(t, true, true, n);
}, xt.cloneWith = function (t, n) {
return fn(t, false, true, n);
}, xt.deburr = Xe, xt.divide = Ui, xt.endsWith = function (t, n, r) {
t = Ze(t), n = typeof n == 'string' ? n : n + '';
var e = t.length;
return r = r === T ? e : on(De(r), 0, e), r -= n.length, r >= 0 && t.indexOf(n, r) == r;
}, xt.eq = be, xt.escape = function (t) {
return (t = Ze(t)) && tt.test(t) ? t.replace(Q, C) : t;
}, xt.escapeRegExp = function (t) {
return (t = Ze(t)) && ct.test(t) ? t.replace(ft, '\\$&') : t;
}, xt.every = function (t, n, r) {
var e = Qo(t) ? o : hn;
return r && Fr(t, n, r) && (n = T), e(t, Sr(n, 3));
}, xt.find = function (t, n) {
if (n = Sr(n, 3), Qo(t)) {
var r = g(t, n);
return r > -1 ? t[r] : T;
}
return v(t, n, fo);
}, xt.findIndex = function (t, n) {
return t && t.length ? g(t, Sr(n, 3)) : -1;
}, xt.findKey = function (t, n) {
return v(t, Sr(n, 3), vn, true);
}, xt.findLast = function (t, n) {
if (n = Sr(n, 3), Qo(t)) {
var r = g(t, n, true);
return r > -1 ? t[r] : T;
}
return v(t, n, co);
}, xt.findLastIndex = function (t, n) {
return t && t.length ? g(t, Sr(n, 3), true) : -1;
}, xt.findLastKey = function (t, n) {
return v(t, Sr(n, 3), gn, true);
}, xt.floor = Mi, xt.forEach = fe, xt.forEachRight = ce, xt.forIn = function (t, n) {
return null == t ? t : ao(t, Sr(n), Ge);
}, xt.forInRight = function (t, n) {
return null == t ? t : lo(t, Sr(n), Ge);
}, xt.forOwn = function (t, n) {
return t && vn(t, Sr(n));
}, xt.forOwnRight = function (t, n) {
return t && gn(t, Sr(n));
}, xt.get = qe, xt.gt = xe, xt.gte = function (t, n) {
return t >= n;
}, xt.has = Te, xt.hasIn = Ve, xt.head = Qr, xt.identity = ru, xt.includes = function (t, n, r, e) {
return t = me(t) ? t : He(t), r = r && !e ? De(r) : 0, e = t.length, 0 > r && (r = Du(e + r, 0)), ze(t) ? e >= r && -1 < t.indexOf(n, r) : !!e && -1 < d(t, n, r);
}, xt.indexOf = function (t, n, r) {
var e = t ? t.length : 0;
return e ? (r = De(r), 0 > r && (r = Du(e + r, 0)), d(t, n, r)) : -1;
}, xt.inRange = function (t, n, r) {
return n = Ne(n) || 0, r === T ? (r = n, n = 0) : r = Ne(r) || 0, t = Ne(t), t >= Fu(n, r) && t < Du(n, r);
}, xt.invoke = ai, xt.isArguments = je, xt.isArray = Qo, xt.isArrayBuffer = function (t) {
return Se(t) && '[object ArrayBuffer]' == yu.call(t);
}, xt.isArrayLike = me, xt.isArrayLikeObject = we, xt.isBoolean = function (t) {
return true === t || false === t || Se(t) && '[object Boolean]' == yu.call(t);
}, xt.isBuffer = Xo, xt.isDate = function (t) {
return Se(t) && '[object Date]' == yu.call(t);
}, xt.isElement = function (t) {
return !!t && 1 === t.nodeType && Se(t) && !Be(t);
}, xt.isEmpty = function (t) {
if (me(t) && (Qo(t) || ze(t) || Oe(t.splice) || je(t) || Xo(t)))
return !t.length;
if (Se(t)) {
var n = zr(t);
if ('[object Map]' == n || '[object Set]' == n)
return !t.size;
}
for (var r in t)
if (vu.call(t, r))
return false;
return !(Hu && Ke(t).length);
}, xt.isEqual = function (t, n) {
return On(t, n);
}, xt.isEqualWith = function (t, n, r) {
var e = (r = typeof r == 'function' ? r : T) ? r(t, n) : T;
return e === T ? On(t, n, r) : !!e;
}, xt.isError = Ae, xt.isFinite = function (t) {
return typeof t == 'number' && Mu(t);
}, xt.isFunction = Oe, xt.isInteger = ke, xt.isLength = Ee, xt.isMap = function (t) {
return Se(t) && '[object Map]' == zr(t);
}, xt.isMatch = function (t, n) {
return t === n || kn(t, n, Rr(n));
}, xt.isMatchWith = function (t, n, r) {
return r = typeof r == 'function' ? r : T, kn(t, n, Rr(n), r);
}, xt.isNaN = function (t) {
return We(t) && t != +t;
}, xt.isNative = Re, xt.isNil = function (t) {
return null == t;
}, xt.isNull = function (t) {
return null === t;
}, xt.isNumber = We, xt.isObject = Ie, xt.isObjectLike = Se, xt.isPlainObject = Be, xt.isRegExp = Ce, xt.isSafeInteger = function (t) {
return ke(t) && t >= -9007199254740991 && 9007199254740991 >= t;
}, xt.isSet = function (t) {
return Se(t) && '[object Set]' == zr(t);
}, xt.isString = ze, xt.isSymbol = Ue, xt.isTypedArray = Me, xt.isUndefined = function (t) {
return t === T;
}, xt.isWeakMap = function (t) {
return Se(t) && '[object WeakMap]' == zr(t);
}, xt.isWeakSet = function (t) {
return Se(t) && '[object WeakSet]' == yu.call(t);
}, xt.join = function (t, n) {
return t ? Lu.call(t, n) : '';
}, xt.kebabCase = vi, xt.last = Xr, xt.lastIndexOf = function (t, n, r) {
var e = t ? t.length : 0;
if (!e)
return -1;
var u = e;
if (r !== T && (u = De(r), u = (0 > u ? Du(e + u, 0) : Fu(u, e - 1)) + 1), n !== n)
return U(t, u, true);
for (; u--;)
if (t[u] === n)
return u;
return -1;
}, xt.lowerCase = gi, xt.lowerFirst = di, xt.lt = Le, xt.lte = function (t, n) {
return n >= t;
}, xt.max = function (t) {
return t && t.length ? _(t, ru, xe) : T;
}, xt.maxBy = function (t, n) {
return t && t.length ? _(t, Sr(n), xe) : T;
}, xt.mean = function (t) {
return b(t, ru);
}, xt.meanBy = function (t, n) {
return b(t, Sr(n));
}, xt.min = function (t) {
return t && t.length ? _(t, ru, Le) : T;
}, xt.minBy = function (t, n) {
return t && t.length ? _(t, Sr(n), Le) : T;
}, xt.multiply = Li, xt.noConflict = function () {
return Jt._ === this && (Jt._ = bu), this;
}, xt.noop = ou, xt.now = Zo, xt.pad = function (t, n, r) {
t = Ze(t);
var e = (n = De(n)) ? P(t) : 0;
return n && n > e ? (n = (n - e) / 2, xr(zu(n), r) + t + xr(Cu(n), r)) : t;
}, xt.padEnd = function (t, n, r) {
t = Ze(t);
var e = (n = De(n)) ? P(t) : 0;
return n && n > e ? t + xr(n - e, r) : t;
}, xt.padStart = function (t, n, r) {
t = Ze(t);
var e = (n = De(n)) ? P(t) : 0;
return n && n > e ? xr(n - e, r) + t : t;
}, xt.parseInt = function (t, n, r) {
return r || null == n ? n = 0 : n && (n = +n), t = Ze(t).replace(at, ''), Nu(t, n || (vt.test(t) ? 16 : 10));
}, xt.random = function (t, n, r) {
if (r && typeof r != 'boolean' && Fr(t, n, r) && (n = r = T), r === T && (typeof n == 'boolean' ? (r = n, n = T) : typeof t == 'boolean' && (r = t, t = T)), t === T && n === T ? (t = 0, n = 1) : (t = Ne(t) || 0, n === T ? (n = t, t = 0) : n = Ne(n) || 0), t > n) {
var e = t;
t = n, n = e;
}
return r || t % 1 || n % 1 ? (r = Pu(), Fu(t + r * (n - t + Nt('1e-' + ((r + '').length - 1))), n)) : Fn(t, n);
}, xt.reduce = function (t, n, r) {
var e = Qo(t) ? s : x, u = 3 > arguments.length;
return e(t, Sr(n, 4), r, u, fo);
}, xt.reduceRight = function (t, n, r) {
var e = Qo(t) ? h : x, u = 3 > arguments.length;
return e(t, Sr(n, 4), r, u, co);
}, xt.repeat = function (t, n, r) {
return n = (r ? Fr(t, n, r) : n === T) ? 1 : De(n), Nn(Ze(t), n);
}, xt.replace = function () {
var t = arguments, n = Ze(t[0]);
return 3 > t.length ? n : n.replace(t[1], t[2]);
}, xt.result = function (t, n, r) {
n = Nr(n, t) ? [n] : un(n);
var e = -1, u = n.length;
for (u || (t = T, u = 1); ++e < u;) {
var o = null == t ? T : t[n[e]];
o === T && (e = u, o = r), t = Oe(o) ? o.call(t) : o;
}
return t;
}, xt.round = $i, xt.runInContext = q, xt.sample = function (t) {
t = me(t) ? t : He(t);
var n = t.length;
return n > 0 ? t[Fn(0, n - 1)] : T;
}, xt.size = function (t) {
if (null == t)
return 0;
if (me(t)) {
var n = t.length;
return n && ze(t) ? P(t) : n;
}
return Se(t) && (n = zr(t), '[object Map]' == n || '[object Set]' == n) ? t.size : Ke(t).length;
}, xt.snakeCase = yi, xt.some = function (t, n, r) {
var e = Qo(t) ? p : qn;
return r && Fr(t, n, r) && (n = T), e(t, Sr(n, 3));
}, xt.sortedIndex = function (t, n) {
return Tn(t, n);
}, xt.sortedIndexBy = function (t, n, r) {
return Vn(t, n, Sr(r));
}, xt.sortedIndexOf = function (t, n) {
var r = t ? t.length : 0;
if (r) {
var e = Tn(t, n);
if (r > e && be(t[e], n))
return e;
}
return -1;
}, xt.sortedLastIndex = function (t, n) {
return Tn(t, n, true);
}, xt.sortedLastIndexBy = function (t, n, r) {
return Vn(t, n, Sr(r), true);
}, xt.sortedLastIndexOf = function (t, n) {
if (t && t.length) {
var r = Tn(t, n, true) - 1;
if (be(t[r], n))
return r;
}
return -1;
}, xt.startCase = bi, xt.startsWith = function (t, n, r) {
return t = Ze(t), r = on(De(r), 0, t.length), t.lastIndexOf(n, r) == r;
}, xt.subtract = Di, xt.sum = function (t) {
return t && t.length ? m(t, ru) : 0;
}, xt.sumBy = function (t, n) {
return t && t.length ? m(t, Sr(n)) : 0;
}, xt.template = function (t, n, r) {
var e = xt.templateSettings;
r && Fr(t, n, r) && (n = T), t = Ze(t), n = ri({}, n, e, Gt), r = ri({}, n.imports, e.imports, Gt);
var u, o, i = Ke(r), f = k(r, i), c = 0;
r = n.interpolate || mt;
var a = '__p+=\'';
r = lu((n.escape || mt).source + '|' + r.source + '|' + (r === et ? pt : mt).source + '|' + (n.evaluate || mt).source + '|$', 'g');
var l = 'sourceURL' in n ? '//# sourceURL=' + n.sourceURL + '\n' : '';
if (t.replace(r, function (n, r, e, i, f, l) {
return e || (e = i), a += t.slice(c, l).replace(wt, z), r && (u = true, a += '\'+__e(' + r + ')+\''), f && (o = true, a += '\';' + f + ';\n__p+=\''), e && (a += '\'+((__t=(' + e + '))==null?\'\':__t)+\''), c = l + n.length, n;
}), a += '\';', (n = n.variable) || (a = 'with(obj){' + a + '}'), a = (o ? a.replace(G, '') : a).replace(J, '$1').replace(Y, '$1;'), a = 'function(' + (n || 'obj') + '){' + (n ? '' : 'obj||(obj={});') + 'var __t,__p=\'\'' + (u ? ',__e=_.escape' : '') + (o ? ',__j=Array.prototype.join;function print(){__p+=__j.call(arguments,\'\')}' : ';') + a + 'return __p}', n = mi(function () {
return Function(i, l + 'return ' + a).apply(T, f);
}), n.source = a, Ae(n))
throw n;
return n;
}, xt.times = function (t, n) {
if (t = De(t), 1 > t || t > 9007199254740991)
return [];
var r = 4294967295, e = Fu(t, 4294967295);
for (n = Sr(n), t -= 4294967295, e = w(e, n); ++r < t;)
n(r);
return e;
}, xt.toInteger = De, xt.toLength = Fe, xt.toLower = function (t) {
return Ze(t).toLowerCase();
}, xt.toNumber = Ne, xt.toSafeInteger = function (t) {
return on(De(t), -9007199254740991, 9007199254740991);
}, xt.toString = Ze, xt.toUpper = function (t) {
return Ze(t).toUpperCase();
}, xt.trim = function (t, n, r) {
return (t = Ze(t)) ? r || n === T ? t.replace(at, '') : (n += '') ? (t = t.match(It), n = n.match(It), t.slice(E(t, n), I(t, n) + 1).join('')) : t : t;
}, xt.trimEnd = function (t, n, r) {
return (t = Ze(t)) ? r || n === T ? t.replace(st, '') : (n += '') ? (t = t.match(It), t.slice(0, I(t, n.match(It)) + 1).join('')) : t : t;
}, xt.trimStart = function (t, n, r) {
return (t = Ze(t)) ? r || n === T ? t.replace(lt, '') : (n += '') ? (t = t.match(It), t.slice(E(t, n.match(It))).join('')) : t : t;
}, xt.truncate = function (t, n) {
var r = 30, e = '...';
if (Ie(n))
var u = 'separator' in n ? n.separator : u, r = 'length' in n ? De(n.length) : r, e = 'omission' in n ? Ze(n.omission) : e;
t = Ze(t);
var o = t.length;
if (St.test(t))
var i = t.match(It), o = i.length;
if (r >= o)
return t;
if (o = r - P(e), 1 > o)
return e;
if (r = i ? i.slice(0, o).join('') : t.slice(0, o), u === T)
return r + e;
if (i && (o += r.length - o), Ce(u)) {
if (t.slice(o).search(u)) {
var f = r;
for (u.global || (u = lu(u.source, Ze(_t.exec(u)) + 'g')), u.lastIndex = 0; i = u.exec(f);)
var c = i.index;
r = r.slice(0, c === T ? o : c);
}
} else
t.indexOf(u, o) != o && (u = r.lastIndexOf(u), u > -1 && (r = r.slice(0, u)));
return r + e;
}, xt.unescape = function (t) {
return (t = Ze(t)) && X.test(t) ? t.replace(H, Z) : t;
}, xt.uniqueId = function (t) {
var n = ++gu;
return Ze(t) + n;
}, xt.upperCase = xi, xt.upperFirst = ji, xt.each = fe, xt.eachRight = ce, xt.first = Qr, uu(xt, function () {
var t = {};
return vn(xt, function (n, r) {
vu.call(xt.prototype, r) || (t[r] = n);
}), t;
}(), { chain: false }), xt.VERSION = '4.8.2', u('bind bindKey curry curryRight partial partialRight'.split(' '), function (t) {
xt[t].placeholder = xt;
}), u([
'drop',
'take'
], function (t, n) {
kt.prototype[t] = function (r) {
var e = this.__filtered__;
if (e && !n)
return new kt(this);
r = r === T ? 1 : Du(De(r), 0);
var u = this.clone();
return e ? u.__takeCount__ = Fu(r, u.__takeCount__) : u.__views__.push({
size: Fu(r, 4294967295),
type: t + (0 > u.__dir__ ? 'Right' : '')
}), u;
}, kt.prototype[t + 'Right'] = function (n) {
return this.reverse()[t](n).reverse();
};
}), u([
'filter',
'map',
'takeWhile'
], function (t, n) {
var r = n + 1, e = 1 == r || 3 == r;
kt.prototype[t] = function (t) {
var n = this.clone();
return n.__iteratees__.push({
iteratee: Sr(t, 3),
type: r
}), n.__filtered__ = n.__filtered__ || e, n;
};
}), u([
'head',
'last'
], function (t, n) {
var r = 'take' + (n ? 'Right' : '');
kt.prototype[t] = function () {
return this[r](1).value()[0];
};
}), u([
'initial',
'tail'
], function (t, n) {
var r = 'drop' + (n ? '' : 'Right');
kt.prototype[t] = function () {
return this.__filtered__ ? new kt(this) : this[r](1);
};
}), kt.prototype.compact = function () {
return this.filter(ru);
}, kt.prototype.find = function (t) {
return this.filter(t).head();
}, kt.prototype.findLast = function (t) {
return this.reverse().find(t);
}, kt.prototype.invokeMap = de(function (t, n) {
return typeof t == 'function' ? new kt(this) : this.map(function (r) {
return An(r, t, n);
});
}), kt.prototype.reject = function (t) {
return t = Sr(t, 3), this.filter(function (n) {
return !t(n);
});
}, kt.prototype.slice = function (t, n) {
t = De(t);
var r = this;
return r.__filtered__ && (t > 0 || 0 > n) ? new kt(r) : (0 > t ? r = r.takeRight(-t) : t && (r = r.drop(t)), n !== T && (n = De(n), r = 0 > n ? r.dropRight(-n) : r.take(n - t)), r);
}, kt.prototype.takeRightWhile = function (t) {
return this.reverse().takeWhile(t).reverse();
}, kt.prototype.toArray = function () {
return this.take(4294967295);
}, vn(kt.prototype, function (t, n) {
var r = /^(?:filter|find|map|reject)|While$/.test(n), e = /^(?:head|last)$/.test(n), u = xt[e ? 'take' + ('last' == n ? 'Right' : '') : n], o = e || /^find/.test(n);
u && (xt.prototype[n] = function () {
function n(t) {
return t = u.apply(xt, l([t], f)), e && h ? t[0] : t;
}
var i = this.__wrapped__, f = e ? [1] : arguments, c = i instanceof kt, a = f[0], s = c || Qo(i);
s && r && typeof a == 'function' && 1 != a.length && (c = s = false);
var h = this.__chain__, p = !!this.__actions__.length, a = o && !h, c = c && !p;
return !o && s ? (i = c ? i : new kt(this), i = t.apply(i, f), i.__actions__.push({
func: oe,
args: [n],
thisArg: T
}), new Ot(i, h)) : a && c ? t.apply(this, f) : (i = this.thru(n), a ? e ? i.value()[0] : i.value() : i);
});
}), u('pop push shift sort splice unshift'.split(' '), function (t) {
var n = hu[t], r = /^(?:push|sort|unshift)$/.test(t) ? 'tap' : 'thru', e = /^(?:pop|shift)$/.test(t);
xt.prototype[t] = function () {
var t = arguments;
if (e && !this.__chain__) {
var u = this.value();
return n.apply(Qo(u) ? u : [], t);
}
return this[r](function (r) {
return n.apply(Qo(r) ? r : [], t);
});
};
}), vn(kt.prototype, function (t, n) {
var r = xt[n];
if (r) {
var e = r.name + '';
(Qu[e] || (Qu[e] = [])).push({
name: n,
func: r
});
}
}), Qu[dr(T, 2).name] = [{
name: 'wrapper',
func: T
}], kt.prototype.clone = function () {
var t = new kt(this.__wrapped__);
return t.__actions__ = er(this.__actions__), t.__dir__ = this.__dir__, t.__filtered__ = this.__filtered__, t.__iteratees__ = er(this.__iteratees__), t.__takeCount__ = this.__takeCount__, t.__views__ = er(this.__views__), t;
}, kt.prototype.reverse = function () {
if (this.__filtered__) {
var t = new kt(this);
t.__dir__ = -1, t.__filtered__ = true;
} else
t = this.clone(), t.__dir__ *= -1;
return t;
}, kt.prototype.value = function () {
var t, n = this.__wrapped__.value(), r = this.__dir__, e = Qo(n), u = 0 > r, o = e ? n.length : 0;
t = o;
for (var i = this.__views__, f = 0, c = -1, a = i.length; ++c < a;) {
var l = i[c], s = l.size;
switch (l.type) {
case 'drop':
f += s;
break;
case 'dropRight':
t -= s;
break;
case 'take':
t = Fu(t, f + s);
break;
case 'takeRight':
f = Du(f, t - s);
}
}
if (t = {
start: f,
end: t
}, i = t.start, f = t.end, t = f - i, u = u ? f : i - 1, i = this.__iteratees__, f = i.length, c = 0, a = Fu(t, this.__takeCount__), !e || 200 > o || o == t && a == t)
return Yn(n, this.__actions__);
e = [];
t:
for (; t-- && a > c;) {
for (u += r, o = -1, l = n[u]; ++o < f;) {
var h = i[o], s = h.type, h = (0, h.iteratee)(l);
if (2 == s)
l = h;
else if (!h) {
if (1 == s)
continue t;
break t;
}
}
e[c++] = l;
}
return e;
}, xt.prototype.at = Mo, xt.prototype.chain = function () {
return ue(this);
}, xt.prototype.commit = function () {
return new Ot(this.value(), this.__chain__);
}, xt.prototype.next = function () {
this.__values__ === T && (this.__values__ = $e(this.value()));
var t = this.__index__ >= this.__values__.length, n = t ? T : this.__values__[this.__index__++];
return {
done: t,
value: n
};
}, xt.prototype.plant = function (t) {
for (var n, r = this; r instanceof At;) {
var e = Jr(r);
e.__index__ = 0, e.__values__ = T, n ? u.__wrapped__ = e : n = e;
var u = e, r = r.__wrapped__;
}
return u.__wrapped__ = t, n;
}, xt.prototype.reverse = function () {
var t = this.__wrapped__;
return t instanceof kt ? (this.__actions__.length && (t = new kt(this)), t = t.reverse(), t.__actions__.push({
func: oe,
args: [ne],
thisArg: T
}), new Ot(t, this.__chain__)) : this.thru(ne);
}, xt.prototype.toJSON = xt.prototype.valueOf = xt.prototype.value = function () {
return Yn(this.__wrapped__, this.__actions__);
}, Iu && (xt.prototype[Iu] = ie), xt;
}
var T, V = 1 / 0, K = NaN, G = /\b__p\+='';/g, J = /\b(__p\+=)''\+/g, Y = /(__e\(.*?\)|\b__t\))\+'';/g, H = /&(?:amp|lt|gt|quot|#39|#96);/g, Q = /[&<>"'`]/g, X = RegExp(H.source), tt = RegExp(Q.source), nt = /<%-([\s\S]+?)%>/g, rt = /<%([\s\S]+?)%>/g, et = /<%=([\s\S]+?)%>/g, ut = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/, ot = /^\w*$/, it = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]/g, ft = /[\\^$.*+?()[\]{}|]/g, ct = RegExp(ft.source), at = /^\s+|\s+$/g, lt = /^\s+/, st = /\s+$/, ht = /\\(\\)?/g, pt = /\$\{([^\\}]*(?:\\.[^\\}]*)*)\}/g, _t = /\w*$/, vt = /^0x/i, gt = /^[-+]0x[0-9a-f]+$/i, dt = /^0b[01]+$/i, yt = /^\[object .+?Constructor\]$/, bt = /^0o[0-7]+$/i, xt = /^(?:0|[1-9]\d*)$/, jt = /[\xc0-\xd6\xd8-\xde\xdf-\xf6\xf8-\xff]/g, mt = /($^)/, wt = /['\n\r\u2028\u2029\\]/g, At = '[\\ufe0e\\ufe0f]?(?:[\\u0300-\\u036f\\ufe20-\\ufe23\\u20d0-\\u20f0]|\\ud83c[\\udffb-\\udfff])?(?:\\u200d(?:[^\\ud800-\\udfff]|(?:\\ud83c[\\udde6-\\uddff]){2}|[\\ud800-\\udbff][\\udc00-\\udfff])[\\ufe0e\\ufe0f]?(?:[\\u0300-\\u036f\\ufe20-\\ufe23\\u20d0-\\u20f0]|\\ud83c[\\udffb-\\udfff])?)*', Ot = '(?:[\\u2700-\\u27bf]|(?:\\ud83c[\\udde6-\\uddff]){2}|[\\ud800-\\udbff][\\udc00-\\udfff])' + At, kt = '(?:[^\\ud800-\\udfff][\\u0300-\\u036f\\ufe20-\\ufe23\\u20d0-\\u20f0]?|[\\u0300-\\u036f\\ufe20-\\ufe23\\u20d0-\\u20f0]|(?:\\ud83c[\\udde6-\\uddff]){2}|[\\ud800-\\udbff][\\udc00-\\udfff]|[\\ud800-\\udfff])', Et = RegExp('[\\u0300-\\u036f\\ufe20-\\ufe23\\u20d0-\\u20f0]', 'g'), It = RegExp('\\ud83c[\\udffb-\\udfff](?=\\ud83c[\\udffb-\\udfff])|' + kt + At, 'g'), St = RegExp('[\\u200d\\ud800-\\udfff\\u0300-\\u036f\\ufe20-\\ufe23\\u20d0-\\u20f0\\ufe0e\\ufe0f]'), Rt = /[a-zA-Z0-9]+/g, Wt = RegExp([
'[A-Z\\xc0-\\xd6\\xd8-\\xde]?[a-z\\xdf-\\xf6\\xf8-\\xff]+(?=[\\xac\\xb1\\xd7\\xf7\\x00-\\x2f\\x3a-\\x40\\x5b-\\x60\\x7b-\\xbf\\u2018\\u2019\\u201c\\u201d \\t\\x0b\\f\\xa0\\ufeff\\n\\r\\u2028\\u2029\\u1680\\u180e\\u2000\\u2001\\u2002\\u2003\\u2004\\u2005\\u2006\\u2007\\u2008\\u2009\\u200a\\u202f\\u205f\\u3000]|[A-Z\\xc0-\\xd6\\xd8-\\xde]|$)|(?:[A-Z\\xc0-\\xd6\\xd8-\\xde]|[^\\ud800-\\udfff\\xac\\xb1\\xd7\\xf7\\x00-\\x2f\\x3a-\\x40\\x5b-\\x60\\x7b-\\xbf\\u2018\\u2019\\u201c\\u201d \\t\\x0b\\f\\xa0\\ufeff\\n\\r\\u2028\\u2029\\u1680\\u180e\\u2000\\u2001\\u2002\\u2003\\u2004\\u2005\\u2006\\u2007\\u2008\\u2009\\u200a\\u202f\\u205f\\u3000\\d+\\u2700-\\u27bfa-z\\xdf-\\xf6\\xf8-\\xffA-Z\\xc0-\\xd6\\xd8-\\xde])+(?=[\\xac\\xb1\\xd7\\xf7\\x00-\\x2f\\x3a-\\x40\\x5b-\\x60\\x7b-\\xbf\\u2018\\u2019\\u201c\\u201d \\t\\x0b\\f\\xa0\\ufeff\\n\\r\\u2028\\u2029\\u1680\\u180e\\u2000\\u2001\\u2002\\u2003\\u2004\\u2005\\u2006\\u2007\\u2008\\u2009\\u200a\\u202f\\u205f\\u3000]|[A-Z\\xc0-\\xd6\\xd8-\\xde](?:[a-z\\xdf-\\xf6\\xf8-\\xff]|[^\\ud800-\\udfff\\xac\\xb1\\xd7\\xf7\\x00-\\x2f\\x3a-\\x40\\x5b-\\x60\\x7b-\\xbf\\u2018\\u2019\\u201c\\u201d \\t\\x0b\\f\\xa0\\ufeff\\n\\r\\u2028\\u2029\\u1680\\u180e\\u2000\\u2001\\u2002\\u2003\\u2004\\u2005\\u2006\\u2007\\u2008\\u2009\\u200a\\u202f\\u205f\\u3000\\d+\\u2700-\\u27bfa-z\\xdf-\\xf6\\xf8-\\xffA-Z\\xc0-\\xd6\\xd8-\\xde])|$)|[A-Z\\xc0-\\xd6\\xd8-\\xde]?(?:[a-z\\xdf-\\xf6\\xf8-\\xff]|[^\\ud800-\\udfff\\xac\\xb1\\xd7\\xf7\\x00-\\x2f\\x3a-\\x40\\x5b-\\x60\\x7b-\\xbf\\u2018\\u2019\\u201c\\u201d \\t\\x0b\\f\\xa0\\ufeff\\n\\r\\u2028\\u2029\\u1680\\u180e\\u2000\\u2001\\u2002\\u2003\\u2004\\u2005\\u2006\\u2007\\u2008\\u2009\\u200a\\u202f\\u205f\\u3000\\d+\\u2700-\\u27bfa-z\\xdf-\\xf6\\xf8-\\xffA-Z\\xc0-\\xd6\\xd8-\\xde])+|[A-Z\\xc0-\\xd6\\xd8-\\xde]+|\\d+',
Ot
].join('|'), 'g'), Bt = /[a-z][A-Z]|[A-Z]{2,}[a-z]|[0-9][a-zA-Z]|[a-zA-Z][0-9]|[^a-zA-Z0-9 ]/, Ct = 'Array Buffer DataView Date Error Float32Array Float64Array Function Int8Array Int16Array Int32Array Map Math Object Promise Reflect RegExp Set String Symbol TypeError Uint8Array Uint8ClampedArray Uint16Array Uint32Array WeakMap _ clearTimeout isFinite parseInt setTimeout'.split(' '), zt = {};
zt['[object Float32Array]'] = zt['[object Float64Array]'] = zt['[object Int8Array]'] = zt['[object Int16Array]'] = zt['[object Int32Array]'] = zt['[object Uint8Array]'] = zt['[object Uint8ClampedArray]'] = zt['[object Uint16Array]'] = zt['[object Uint32Array]'] = true, zt['[object Arguments]'] = zt['[object Array]'] = zt['[object ArrayBuffer]'] = zt['[object Boolean]'] = zt['[object DataView]'] = zt['[object Date]'] = zt['[object Error]'] = zt['[object Function]'] = zt['[object Map]'] = zt['[object Number]'] = zt['[object Object]'] = zt['[object RegExp]'] = zt['[object Set]'] = zt['[object String]'] = zt['[object WeakMap]'] = false;
var Ut = {};
Ut['[object Arguments]'] = Ut['[object Array]'] = Ut['[object ArrayBuffer]'] = Ut['[object DataView]'] = Ut['[object Boolean]'] = Ut['[object Date]'] = Ut['[object Float32Array]'] = Ut['[object Float64Array]'] = Ut['[object Int8Array]'] = Ut['[object Int16Array]'] = Ut['[object Int32Array]'] = Ut['[object Map]'] = Ut['[object Number]'] = Ut['[object Object]'] = Ut['[object RegExp]'] = Ut['[object Set]'] = Ut['[object String]'] = Ut['[object Symbol]'] = Ut['[object Uint8Array]'] = Ut['[object Uint8ClampedArray]'] = Ut['[object Uint16Array]'] = Ut['[object Uint32Array]'] = true, Ut['[object Error]'] = Ut['[object Function]'] = Ut['[object WeakMap]'] = false;
var Mt = {
'À': 'A',
'Á': 'A',
'Â': 'A',
'Ã': 'A',
'Ä': 'A',
'Å': 'A',
'à': 'a',
'á': 'a',
'â': 'a',
'ã': 'a',
'ä': 'a',
'å': 'a',
'Ç': 'C',
'ç': 'c',
'Ð': 'D',
'ð': 'd',
'È': 'E',
'É': 'E',
'Ê': 'E',
'Ë': 'E',
'è': 'e',
'é': 'e',
'ê': 'e',
'ë': 'e',
'Ì': 'I',
'Í': 'I',
'Î': 'I',
'Ï': 'I',
'ì': 'i',
'í': 'i',
'î': 'i',
'ï': 'i',
'Ñ': 'N',
'ñ': 'n',
'Ò': 'O',
'Ó': 'O',
'Ô': 'O',
'Õ': 'O',
'Ö': 'O',
'Ø': 'O',
'ò': 'o',
'ó': 'o',
'ô': 'o',
'õ': 'o',
'ö': 'o',
'ø': 'o',
'Ù': 'U',
'Ú': 'U',
'Û': 'U',
'Ü': 'U',
'ù': 'u',
'ú': 'u',
'û': 'u',
'ü': 'u',
'Ý': 'Y',
'ý': 'y',
'ÿ': 'y',
'Æ': 'Ae',
'æ': 'ae',
'Þ': 'Th',
'þ': 'th',
'ß': 'ss'
}, Lt = {
'&': '&amp;',
'<': '&lt;',
'>': '&gt;',
'"': '&quot;',
'\'': '&#39;',
'`': '&#96;'
}, $t = {
'&amp;': '&',
'&lt;': '<',
'&gt;': '>',
'&quot;': '"',
'&#39;': '\'',
'&#96;': '`'
}, Dt = {
'function': true,
object: true
}, Ft = {
'\\': '\\',
'\'': '\'',
'\n': 'n',
'\r': 'r',
'\u2028': 'u2028',
'\u2029': 'u2029'
}, Nt = parseFloat, Pt = parseInt, Zt = Dt[typeof exports] && exports && !exports.nodeType ? exports : T, qt = Dt[typeof module] && module && !module.nodeType ? module : T, Tt = qt && qt.exports === Zt ? Zt : T, Vt = S(Dt[typeof self] && self), Kt = S(Dt[typeof window] && window), Gt = S(Dt[typeof this] && this), Jt = S(Zt && qt && typeof global == 'object' && global) || Kt !== (Gt && Gt.window) && Kt || Vt || Gt || Function('return this')(), Yt = q();
(Kt || Vt || {})._ = Yt, typeof define == 'function' && typeof define.amd == 'object' && define.amd ? define(function () {
return Yt;
}) : Zt && qt ? (Tt && ((qt.exports = Yt)._ = Yt), Zt._ = Yt) : Jt._ = Yt;
}.call(this));
(function () {
'use strict';
Polymer({
is: 'moe-video',
properties: {
data: {
type: Array,
value: function () {
return [];
},
observer: '_dataChanged'
},
width: { type: String },
height: { type: String },
listToggle: {
type: Boolean,
value: false,
reflectToAttribute: true
},
listLength: {
type: Number,
value: 0
},
playing: {
type: Boolean,
value: false,
notify: true,
reflectToAttribute: true
},
playingVideoId: {
type: String,
reflectToAttribute: true,
readOnly: true
},
prevPlayedVideo: {
type: String,
readOnly: true
},
placeholder: {
type: Boolean,
computed: '_computePlaying(playing)'
},
startVideoIndex: {
type: Number,
value: 0
},
selectedVideoIndex: {
type: Number,
reflectToAttribute: true
},
playSupported: { type: Boolean },
mobile: {
type: Boolean,
reflectToAttribute: true
}
},
play: function (id) {
if (id === undefined || id === '') {
if (!this.data || !_.get(this.data, '0.videoId')) {
return;
}
this.async(function () {
this.play(this.data[0].videoId);
});
return;
}
if (this.mobile) {
this._checkPlaySupport();
this.async(function () {
if (this.playSupported) {
console.log('Play() Supported:' + this.playSupported);
this.toggleAttribute('playing', true);
this._setPlayingVideoId(id);
this.listen(this.$$('#youtube'), 'google-youtube-ready', '_mobilePlay');
}
}, 1);
}
this.toggleAttribute('playing', true);
this._setPlayingVideoId(id);
},
stop: function (id) {
this._setPrevPlayedVideo(this.playingVideoId);
this._setPlayingVideoId('');
this.toggleAttribute('playing', false);
},
handleStateChange: function (ev) {
if (_.get(ev, 'detail.data') === 0) {
this._nextVideo();
}
},
_dataChanged: function () {
this.selectedVideoIndex = this.startVideoIndex;
this.listLength = this.data.length;
if (this.listLength > 1) {
this.listToggle = true;
}
},
_handleHolderTap: function (e) {
if (e.target.tagName === 'A')
return;
this.play(this.prevPlayedVideo);
},
_handleChipTap: function (e) {
this.play(e.model.item.videoId);
},
_handlePlayControl: function (e) {
var action = Polymer.dom(e).localTarget.getAttribute('action-type');
switch (action) {
case 'next':
this._nextVideo();
break;
case 'prev':
this._prevVideo();
break;
case 'stop':
this.stop();
break;
}
},
_nextVideo: function () {
if (this.selectedVideoIndex < this.data.length - 1) {
this.selectedVideoIndex++;
} else {
this.selectedVideoIndex = 0;
}
var videoId = _.get(this.data, this.selectedVideoIndex + '.videoId');
if (videoId) {
this.play(videoId);
this._scrollToSelectedVideo();
} else {
console.warn('videoId not found at data[selectedVideoIndex]: ' + this.selectedVideoIndex);
}
},
_prevVideo: function () {
if (this.selectedVideoIndex > 0) {
this.selectedVideoIndex--;
this.play(this.data[this.selectedVideoIndex].videoId);
this._scrollToSelectedVideo();
}
},
_scrollToSelectedVideo: function () {
var videoSelectorScroller = this.$$('#videoSelectorScroller');
var videoSelector = this.$$('#videoSelector');
var videoSelectorItem = this.$$('.video-selector-item[data-index="' + this.selectedVideoIndex + '"]');
videoSelectorScroller.scrollTop = videoSelectorItem.offsetTop - videoSelectorItem.offsetHeight;
},
_computePlayIcon: function (data) {
if (!data[0] || data === undefined) {
return 'icons:refresh';
} else {
return 'av:play-arrow';
}
},
_computeContainerClass: function (mobile) {
if (mobile) {
return 'layout vertical';
} else {
return 'layout horizontal';
}
},
_computeSelectedIndex: function (index) {
return index + 1;
},
_computePlaying: function (playing) {
return playing ? false : true;
},
_computeHolderHref: function (index) {
return 'https://www.youtube.com/watch?v=' + this.data[index].videoId;
},
_computeHolderTitle: function (index) {
return this.data[index].title;
},
_computeHolderStyle: function (index) {
return 'background-image: url(http://img.youtube.com/vi/' + this.data[index].videoId + '/mqdefault.jpg)';
},
_computeStartIndex: function (index) {
return index;
},
_checkPlaySupport: function () {
this.async(function () {
this.playSupported = this.$$('#youtube').playsupported;
}, 1);
},
_mobilePlay: function (e) {
}
});
}());