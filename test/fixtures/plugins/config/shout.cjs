// Upper cases the descriptions, to show that the plugins of the project run
exports.handlers = {
	newDoclet({ doclet }) {
		for (const key of ['description', 'classdesc']) {
			if (doclet[key]) doclet[key] = doclet[key].toUpperCase();
		}
	}
};
