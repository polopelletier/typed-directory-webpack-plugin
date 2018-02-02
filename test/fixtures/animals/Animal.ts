export default class Animal {
	type:String;
	says:String;

	constructor(type:String, says:String){
		this.type = type;
		this.says = says;
	}

	talk():String {
		return this.says;
	}
}