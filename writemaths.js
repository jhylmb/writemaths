
function WriteMaths(e,d)
{
	e=$(e);
	e.addClass('writemaths');
	this.e = e;
	d=$(d);
	this.d = d;
	
	var wm = this;

	//clicking on a paragraph makes it editable
	e.find('p, :header').live('click',function(e) {
		var d = input();
		d.val($(this).attr('source'));
		$(this).replaceWith(d);
		d.focus();
	});
	

	//handle keypresses in input
	e.find('textarea').live('keydown',function(ev) {
		switch(ev.which)
		{
		case 8:
			if(this.selectionStart==0 && this.selectionEnd==0)
			{
				var p = $(this).prev('p, :header');
				if(p.length)
				{
					var os = p.attr('source') || '';
					p.attr('source', os+$(this).val());
					p=$(p[0]);
					$(this).attr('going',true);
					$(this).remove();
					p.click();
					e.find('textarea')[0].setSelectionRange(os.length,os.length);
				}
				ev.stopPropagation();
				ev.preventDefault();
			}
			break;
		case 13:
			$(this).attr('going',true);
			var i = this.selectionStart;
			var t = $(this).val().slice(i);
			$(this).val( $(this).val().slice(0,i));
			var d = input2display($(this));
			var i = input();
			i.val(t);
			d.after(i);
			i.focus();
			i[0].setSelectionRange(0,0);
			break;
		case 38:
			$(this).prev('p, :header').click();
			break;
		case 40:
			$(this).next('p, :header').click();
			break;
		case 46:
			var val = $(this).val()
			if(this.selectionStart==val.length && this.selectionEnd==val.length)
			{
				var p = $(this).next('p, :header');
				if(p.length)
				{
					$(this).val(val+(p.attr('source') || ''));
					p.remove();
					this.setSelectionRange(val.length,val.length);
				}
				ev.stopPropagation();
				ev.preventDefault();
			}
			break;
		}
	});
	e.find('textarea').live('keyup',function() {
		wm.saveState();
	});
	e.find('textarea').live('input',function() {
		wm.getHTML();
	});

	e.find('textarea').live('blur',function() {
		if(!$(this).attr('going'))
			input2display($(this));
	});

	e.find('.graph').live('click',function(e){e.preventDefault();e.stopPropagation();if(!e){var e = window.event;};e.cancelBubble = true;return false;});


	///set up
	this.setState(e.text().trim());
	this.load();
}
WriteMaths.numGraphs = 0;

WriteMaths.prototype = {
	load: function() {
		s = window.localStorage['writemaths'];
		if(s)
			this.setState(s);
	},

	setState: function(s) {
		this.e.html('');
		var lines = s.split('\n');
		var i = lines.length;
		while(i--)
		{
			var p = makeParagraph(lines[i]);
			this.e.prepend(p);
			finishParagraph(p);
		}
	},

	getState: function() {
		var lines = this.e.children('p, :header, textarea').map(function(){
			return ($(this).attr('source') || $(this).val());
		}).toArray();
		return lines;
	},

	saveState: function() {
		var s = this.getState().join('\n');
		window.localStorage['writemaths']= s;
	},

	getHTML: function() {
		var d = $('<div/>');
		var lines = this.getState();
		for(var i=0;i<lines.length;i++)
		{
			d.append(makeParagraph(lines[i],true));
		}
		d.find('p, :header').removeAttr('source');
		var html = style_html(d.html(),1,'\t');
		this.d
			.html(html)
			.width('100%')
			.attr('rows',html.split('\n').length)
		;
	}
};

function texMaths(s) {
	var bits = Numbas.jme.splitbrackets(s,'{','}');
	var out = '';
	for(var i=0;i<bits.length;i++)
	{
		if(i%2)	//raw LaTeX
			out += bits[i];
		else
			try{
				out += Numbas.jme.display.exprToLaTeX(bits[i]);
			}catch(e){
				out+=bits[i];
			}
	}
	return out;
};

function input() {
	return $('<textarea rows="1"></textarea>');
}
function makeParagraph(val,notypeset)
{
	if(val.length)
	{
		var d = $('<p></p>');
		var dval = $.trim(val).replace(/\n/g,'');
		dval = textile(dval);
		var bits = Numbas.util.contentsplitbrackets(dval);
		dval='';
		for(var i=0;i<bits.length;i++)
		{
			switch(i % 2)
			{
			case 0:	//text
				dval += bits[i];
				break;
			case 1: //delimiter
				switch(bits[i])
				{
				case '$':
					if(i<bits.length-1)
					{
						dval += '$'+texMaths(bits[i+1])+'$';
						i+=2;
					}
					else
						dval += bits[i];
					break;
				case '\\[':
					if(i<bits.length-1)
					{
						dval += '\\['+texMaths(bits[i+1])+'\\]';
						i+=2;
					}
					else
						dval += bits[i];
					break;
				case '%%':
					if(i<bits.length-1)
					{
						WriteMaths.numGraphs += 1;
						dval += '<div id="jsxgraph-'+WriteMaths.numGraphs+'" class="graph" source="'+bits[i+1]+'"/>';
						i+=2;
					}
					else
						dval += bits[i];
					break;
				}
			}
		}
		d.html(dval);
		var c = d.children();
		if(d.children('p, :header').length==c.length && c.length==1)
		{
			d=$(c[0]);
		}
		d.attr('source',val);
		if(!notypeset)
			MathJax.Hub.Queue(['Typeset',MathJax.Hub,d[0]]);
	}
	else
	{
		d = $('<p><br/></p>');
	}
	return d;
}

function finishParagraph(p) {
	p.find('.graph').each(function() {
		var id = $(this).attr('id');
		var src = $(this).attr('source');
		$(this).css('width','400px').css('height','300px');
		JXG.JSXGraph
			.initBoard(id,{
				showCopyright:false,
				originX: 200,
				originY: 150,
				unitX: 50,
				unitY: 50,
				axis:true
			})
			.construct(src)
		;
	});
}

function input2display(e) {
	var val = e.val();
	var d = makeParagraph(val);
	e.replaceWith(d);
	finishParagraph(d);
	return d;
}

var textile;
(function() {
var inpr,inbq,inbqq,html;
var aliases = new Array;
var alg={'>':'right','<':'left','=':'center','<>':'justify','~':'bottom','^':'top'};
var ent={"'":"&#8217;"," - ":" &#8211; ","--":"&#8212;"," x ":" &#215; ","\\.\\.\\.":"&#8230;","\\(C\\)":"&#169;","\\(R\\)":"&#174;","\\(TM\\)":"&#8482;"};
var tags={"b":"\\*\\*","i":"__","em":"_","strong":"\\*","cite":"\\?\\?","sup":"\\^","sub":"~","span":"\\%","del":"-","code":"@","ins":"\\+","del":"-"};
var le="\n\n";
var lstlev=0,lst="",elst="",intable=0,mm="";
var para = /^p(\S*)\.\s*(.*)/;
var rfn = /^fn(\d+)\.\s*(.*)/;
var bq = /^bq\.(\.)?\s*/;
var table=/^table\s*{(.*)}\..*/;
var trstyle = /^\{(\S+)\}\.\s*\|/;
textile = function(t) {
	t+='\n';
	var lines = t.split(/\r?\n/);
	html="";
	inpr=inbq=inbqq=0;
/*	for(var i=0;i<lines.length;i++) {
		if(lines[i].indexOf("[") == 0) {
			var m = lines[i].indexOf("]");
			aliases[lines[i].substring(1,m)]=lines[i].substring(m+1);
		}
	}
*/
	for(var i=0;i<lines.length;i++) {
		//if (lines[i].indexOf("[") == 0) {continue;}
		if(mm=para.exec(lines[i])){stp(1);inpr=1;html += lines[i].replace(para,"<p"+make_attr(mm[1])+">"+prep(mm[2]));continue;}
		if(mm = /^h(\d)(\S*)\.\s*(.*)/.exec(lines[i])){stp(1);html += tag("h"+mm[1],make_attr(mm[2]),prep(mm[3]))+le;continue;}
		if(mm=rfn.exec(lines[i])){stp(1);inpr=1;html+=lines[i].replace(rfn,'<p id="fn'+mm[1]+'"><sup>'+mm[1]+'<\/sup>'+prep(mm[2]));continue;}
		//if (lines[i].indexOf("*") == 0) {lst="<ul>";elst="<\/ul>";}
		//else if (lines[i].indexOf("#") == 0) {lst="<\ol>";elst="<\/ol>";}
		else {while (lstlev > 0) {html += elst;if(lstlev > 1){html += "<\/li>";}else{html+="\n";}html+="\n";lstlev--;}lst="";}
		if(lst) {
			stp(1);
			var m = /^([*#]+)\s*(.*)/.exec(lines[i]);
			var lev = m[1].length;
			while(lev < lstlev) {html += elst+"<\/li>\n";lstlev--;}
			while(lstlev < lev) {html=html.replace(/<\/li>\n$/,"\n");html += lst;lstlev++;}
			html += tag("li","",prep(m[2]))+"\n";
			continue;
		}
		if (lines[i].match(table)){stp(1);intable=1;html += lines[i].replace(table,'<table style="$1;">\n');continue;}
		if ((lines[i].indexOf("|") == 0)  || (lines[i].match(trstyle)) ) {
			stp(1);
			if(!intable) {html += "<table>\n";intable=1;}
			var rowst="";var trow="";
			var ts=trstyle.exec(lines[i]);
			if(ts){rowst=qat('style',ts[1]);lines[i]=lines[i].replace(trstyle,"\|");}
			var cells = lines[i].split("|");
			for(j=1;j<cells.length-1;j++) {
				var ttag="td";
				if(cells[j].indexOf("_.")==0) {ttag="th";cells[j]=cells[j].substring(2);}
				cells[j]=prep(cells[j]);
				var al=/^([<>=^~\/\\\{]+.*?)\.(.*)/.exec(cells[j]);
				var at="",st="";
				if(al != null) {
					cells[j]=al[2];
					var cs= /\\(\d+)/.exec(al[1]);if(cs != null){at +=qat('colspan',cs[1]);}
					var rs= /\/(\d+)/.exec(al[1]);if(rs != null){at +=qat('rowspan',rs[1]);}
					var va= /([\^~])/.exec(al[1]);if(va != null){st +="vertical-align:"+alg[va[1]]+";";}
					var ta= /(<>|=|<|>)/.exec(al[1]);if(ta != null){st +="text-align:"+alg[ta[1]]+";";}
					var is= /\{([^\}]+)\}/.exec(al[1]);if(is != null){st +=is[1];}
					if(st != ""){at+=qat('style',st);}					
				}
				trow += tag(ttag,at,cells[j]);
			}
			html += "\t"+tag("tr",rowst,trow)+"\n";
			continue;
		}
		if(intable) {html += "<\/table>"+le;intable=0;}

		if (lines[i]=="") {stp();}
		else if (!inpr) {
			if(mm=bq.exec(lines[i])){lines[i]=lines[i].replace(bq,"");html +="<blockquote>";inbq=1;if(mm[1]) {inbqq=1;}}
			if(lines.length>2)
			{
				html += "<p>"+prep(lines[i]);inpr=1;
			}
			else
				html += prep(lines[i]);
		}
		else {html += prep(lines[i]);}
	}
	stp();
	if(intable)
	{
		html+='<\/table>'+le;
		intable=0;
	}
	while (lstlev > 0) 
	{
		html += elst;
		if(lstlev > 1)
		{
			html += "<\/li>";
		}
		else
		{
			html+="\n";
		}
		html+="\n";
		lstlev--;
	}
	lst="";
	return html;
}

function prep(m){
	var bits = Numbas.util.contentsplitbrackets(m);
	var i;
	for( var j=0; j<bits.length; j+=4)
	{
		m = bits[j]
	
		for(i in ent) {m=m.replace(new RegExp(i,"g"),ent[i]);}
		for(i in tags) {
			m = make_tag(m,RegExp("^"+tags[i]+"(.+?)"+tags[i]),i,"");
			m = make_tag(m,RegExp(" "+tags[i]+"(.+?)"+tags[i]),i," ");
		}
		m=m.replace(/\[(\d+)\]/g,'<sup><a href="#fn$1">$1<\/a><\/sup>');
		m=m.replace(/([A-Z]+)\((.*?)\)/g,'<acronym title="$2">$1<\/acronym>');
		m=m.replace(/\"([^\"]+)\":((http|https|mailto):\S+)/g,'<a href="$2">$1<\/a>');
		m = make_image(m,/!([^!\s]+)!:(\S+)/);
		m = make_image(m,/!([^!\s]+)!/);
		m=m.replace(/"([^\"]+)":(\S+)/g,function($0,$1,$2){return tag("a",qat('href',aliases[$2]),$1)});
		m=m.replace(/(=)?"([^\"]+)"/g,function($0,$1,$2){return ($1)?$0:"&#8220;"+$2+"&#8221;"});

		bits[j] = m;
	}
	m = bits.join('');
	return m;
}

function make_tag(s,re,t,sp) {
	var m;
	while(m = re.exec(s)) {
		var st = make_attr(m[1]);
		m[1]=m[1].replace(/^[\[\{\(]\S+[\]\}\)]/g,"");
		m[1]=m[1].replace(/^[<>=()]+/,"");
		s = s.replace(re,sp+tag(t,st,m[1]));
	}
	return s;
}

function make_image(m,re) {
	var ma = re.exec(m);
	if(ma != null) {
		var attr="";var st="";
		var at = /\((.*)\)$/.exec(ma[1]);
		if(at != null) {attr = qat('alt',at[1])+qat("title",at[1]);ma[1]=ma[1].replace(/\((.*)\)$/,"");}
		if(ma[1].match(/^[><]/)) {st = "float:"+((ma[1].indexOf(">")==0)?"right;":"left;");ma[1]=ma[1].replace(/^[><]/,"");}
		var pdl = /(\(+)/.exec(ma[1]);if(pdl){st+="padding-left:"+pdl[1].length+"em;";}
		var pdr = /(\)+)/.exec(ma[1]);if(pdr){st+="padding-right:"+pdr[1].length+"em;";}
		if(st){attr += qat('style',st);}
		var im = '<img src="'+ma[1]+'"'+attr+" />";
		if(ma.length >2) {im=tag('a',qat('href',ma[2]),im);}
		m = m.replace(re,im);
	}
	return m;
}

function make_attr(s) {
	var st="";var at="";
	if(!s){return "";}
	var l=/\[(\w\w)\]/.exec(s);
	if(l != null) {at += qat('lang',l[1]);}
	var ci=/\((\S+)\)/.exec(s);
	if(ci != null) {
		s = s.replace(/\((\S+)\)/,"");
		at += ci[1].replace(/#(.*)$/,' id="$1"').replace(/^(\S+)/,' class="$1"');
	}
	var ta= /(<>|=|<|>)/.exec(s);if(ta){st +="text-align:"+alg[ta[1]]+";";}
	var ss=/\{(\S+)\}/.exec(s);if(ss){st += ss[1];if(!ss[1].match(/;$/)){st+= ";";}}
	var pdl = /(\(+)/.exec(s);if(pdl){st+="padding-left:"+pdl[1].length+"em;";}
	var pdr = /(\)+)/.exec(s);if(pdr){st+="padding-right:"+pdr[1].length+"em;";}
	if(st) {at += qat('style',st);}
	return at;
}

function qat(a,v){return ' '+a+'="'+v+'"';}
function tag(t,a,c) {return "<"+t+a+">"+c+"</"+t+">";}
function stp(b){if(b){inbqq=0;}if(inpr){html+="<\/p>"+le;inpr=0;}if(inbq && !inbqq){html+="<\/blockquote>"+le;inbq=0;}}
})();


/*

 Style HTML
---------------

  Written by Nochum Sossonko, (nsossonko@hotmail.com)

  Based on code initially developed by: Einar Lielmanis, <elfz@laacz.lv>
    http://jsbeautifier.org


  You are free to use this in any way you want, in case you find this useful or working for you.

  Usage:
    style_html(html_source);

*/

function style_html(html_source, indent_size, indent_character, max_char, brace_style) {
//Wrapper function to invoke all the necessary constructors and deal with the output.

  var Parser, multi_parser;

  function Parser() {

    this.pos = 0; //Parser position
    this.token = '';
    this.current_mode = 'CONTENT'; //reflects the current Parser mode: TAG/CONTENT
    this.tags = { //An object to hold tags, their position, and their parent-tags, initiated with default values
      parent: 'parent1',
      parentcount: 1,
      parent1: ''
    };
    this.tag_type = '';
    this.token_text = this.last_token = this.last_text = this.token_type = '';


    this.Utils = { //Uilities made available to the various functions
      whitespace: "\n\r\t ".split(''),
      single_token: 'br,input,link,meta,!doctype,basefont,base,area,hr,wbr,param,img,isindex,?xml,embed'.split(','), //all the single tags for HTML
      extra_liners: 'head,body,/html'.split(','), //for tags that need a line of whitespace before them
      in_array: function (what, arr) {
        for (var i=0; i<arr.length; i++) {
          if (what === arr[i]) {
            return true;
          }
        }
        return false;
      }
    }

    this.get_content = function () { //function to capture regular content between tags

      var input_char = '';
      var content = [];
      var space = false; //if a space is needed
      while (this.input.charAt(this.pos) !== '<') {
        if (this.pos >= this.input.length) {
          return content.length?content.join(''):['', 'TK_EOF'];
        }

        input_char = this.input.charAt(this.pos);
        this.pos++;
        this.line_char_count++;


        if (this.Utils.in_array(input_char, this.Utils.whitespace)) {
          if (content.length) {
            space = true;
          }
          this.line_char_count--;
          continue; //don't want to insert unnecessary space
        }
        else if (space) {
          if (this.line_char_count >= this.max_char) { //insert a line when the max_char is reached
            content.push('\n');
            for (var i=0; i<this.indent_level; i++) {
              content.push(this.indent_string);
            }
            this.line_char_count = 0;
          }
          else{
            content.push(' ');
            this.line_char_count++;
          }
          space = false;
        }
        content.push(input_char); //letter at-a-time (or string) inserted to an array
      }
      return content.length?content.join(''):'';
    }

    this.get_script = function () { //get the full content of a script to pass to js_beautify

      var input_char = '';
      var content = [];
      var reg_match = new RegExp('\<\/script' + '\>', 'igm');
      reg_match.lastIndex = this.pos;
      var reg_array = reg_match.exec(this.input);
      var end_script = reg_array?reg_array.index:this.input.length; //absolute end of script
      while(this.pos < end_script) { //get everything in between the script tags
        if (this.pos >= this.input.length) {
          return content.length?content.join(''):['', 'TK_EOF'];
        }

        input_char = this.input.charAt(this.pos);
        this.pos++;


        content.push(input_char);
      }
      return content.length?content.join(''):''; //we might not have any content at all
    }

    this.record_tag = function (tag){ //function to record a tag and its parent in this.tags Object
      if (this.tags[tag + 'count']) { //check for the existence of this tag type
        this.tags[tag + 'count']++;
        this.tags[tag + this.tags[tag + 'count']] = this.indent_level; //and record the present indent level
      }
      else { //otherwise initialize this tag type
        this.tags[tag + 'count'] = 1;
        this.tags[tag + this.tags[tag + 'count']] = this.indent_level; //and record the present indent level
      }
      this.tags[tag + this.tags[tag + 'count'] + 'parent'] = this.tags.parent; //set the parent (i.e. in the case of a div this.tags.div1parent)
      this.tags.parent = tag + this.tags[tag + 'count']; //and make this the current parent (i.e. in the case of a div 'div1')
    }

    this.retrieve_tag = function (tag) { //function to retrieve the opening tag to the corresponding closer
      if (this.tags[tag + 'count']) { //if the openener is not in the Object we ignore it
        var temp_parent = this.tags.parent; //check to see if it's a closable tag.
        while (temp_parent) { //till we reach '' (the initial value);
          if (tag + this.tags[tag + 'count'] === temp_parent) { //if this is it use it
            break;
          }
          temp_parent = this.tags[temp_parent + 'parent']; //otherwise keep on climbing up the DOM Tree
        }
        if (temp_parent) { //if we caught something
          this.indent_level = this.tags[tag + this.tags[tag + 'count']]; //set the indent_level accordingly
          this.tags.parent = this.tags[temp_parent + 'parent']; //and set the current parent
        }
        delete this.tags[tag + this.tags[tag + 'count'] + 'parent']; //delete the closed tags parent reference...
        delete this.tags[tag + this.tags[tag + 'count']]; //...and the tag itself
        if (this.tags[tag + 'count'] == 1) {
          delete this.tags[tag + 'count'];
        }
        else {
          this.tags[tag + 'count']--;
        }
      }
    }

    this.get_tag = function () { //function to get a full tag and parse its type
      var input_char = '';
      var content = [];
      var space = false;

      do {
        if (this.pos >= this.input.length) {
          return content.length?content.join(''):['', 'TK_EOF'];
        }

        input_char = this.input.charAt(this.pos);
        this.pos++;
        this.line_char_count++;

        if (this.Utils.in_array(input_char, this.Utils.whitespace)) { //don't want to insert unnecessary space
          space = true;
          this.line_char_count--;
          continue;
        }

        if (input_char === "'" || input_char === '"') {
          if (!content[1] || content[1] !== '!') { //if we're in a comment strings don't get treated specially
            input_char += this.get_unformatted(input_char);
            space = true;
          }
        }

        if (input_char === '=') { //no space before =
          space = false;
        }

        if (content.length && content[content.length-1] !== '=' && input_char !== '>'
            && space) { //no space after = or before >
          if (this.line_char_count >= this.max_char) {
            this.print_newline(false, content);
            this.line_char_count = 0;
          }
          else {
            content.push(' ');
            this.line_char_count++;
          }
          space = false;
        }
        content.push(input_char); //inserts character at-a-time (or string)
      } while (input_char !== '>');

      var tag_complete = content.join('');
      var tag_index;
      if (tag_complete.indexOf(' ') != -1) { //if there's whitespace, thats where the tag name ends
        tag_index = tag_complete.indexOf(' ');
      }
      else { //otherwise go with the tag ending
        tag_index = tag_complete.indexOf('>');
      }
      var tag_check = tag_complete.substring(1, tag_index).toLowerCase();
      if (tag_complete.charAt(tag_complete.length-2) === '/' ||
          this.Utils.in_array(tag_check, this.Utils.single_token)) { //if this tag name is a single tag type (either in the list or has a closing /)
        this.tag_type = 'SINGLE';
      }
      else if (tag_check === 'script') { //for later script handling
        this.record_tag(tag_check);
        this.tag_type = 'SCRIPT';
      }
      else if (tag_check === 'style') { //for future style handling (for now it justs uses get_content)
        this.record_tag(tag_check);
        this.tag_type = 'STYLE';
      }
      else if (tag_check === 'a') { // do not reformat the <a> links
        var comment = this.get_unformatted('</a>', tag_complete); //...delegate to get_unformatted function
        content.push(comment);
        this.tag_type = 'SINGLE';
      }
      else if (tag_check.charAt(0) === '!') { //peek for <!-- comment
        if (tag_check.indexOf('[if') != -1) { //peek for <!--[if conditional comment
          if (tag_complete.indexOf('!IE') != -1) { //this type needs a closing --> so...
            var comment = this.get_unformatted('-->', tag_complete); //...delegate to get_unformatted
            content.push(comment);
          }
          this.tag_type = 'START';
        }
        else if (tag_check.indexOf('[endif') != -1) {//peek for <!--[endif end conditional comment
          this.tag_type = 'END';
          this.unindent();
        }
        else if (tag_check.indexOf('[cdata[') != -1) { //if it's a <[cdata[ comment...
          var comment = this.get_unformatted(']]>', tag_complete); //...delegate to get_unformatted function
          content.push(comment);
          this.tag_type = 'SINGLE'; //<![CDATA[ comments are treated like single tags
        }
        else {
          var comment = this.get_unformatted('-->', tag_complete);
          content.push(comment);
          this.tag_type = 'SINGLE';
        }
      }
      else {
        if (tag_check.charAt(0) === '/') { //this tag is a double tag so check for tag-ending
          this.retrieve_tag(tag_check.substring(1)); //remove it and all ancestors
          this.tag_type = 'END';
        }
        else { //otherwise it's a start-tag
          this.record_tag(tag_check); //push it on the tag stack
          this.tag_type = 'START';
        }
        if (this.Utils.in_array(tag_check, this.Utils.extra_liners)) { //check if this double needs an extra line
          this.print_newline(true, this.output);
        }
      }
      return content.join(''); //returns fully formatted tag
    }

    this.get_unformatted = function (delimiter, orig_tag) { //function to return unformatted content in its entirety

      if (orig_tag && orig_tag.indexOf(delimiter) != -1) {
        return '';
      }
      var input_char = '';
      var content = '';
      var space = true;
      do {

        if (this.pos >= this.input.length) {
          return content;
        }

        input_char = this.input.charAt(this.pos);
        this.pos++

        if (this.Utils.in_array(input_char, this.Utils.whitespace)) {
          if (!space) {
            this.line_char_count--;
            continue;
          }
          if (input_char === '\n' || input_char === '\r') {
            content += '\n';
            for (var i=0; i<this.indent_level; i++) {
              content += this.indent_string;
            }
            space = false; //...and make sure other indentation is erased
            this.line_char_count = 0;
            continue;
          }
        }
        content += input_char;
        this.line_char_count++;
        space = true;


      } while (content.indexOf(delimiter) == -1);
      return content;
    }

    this.get_token = function () { //initial handler for token-retrieval
      var token;

      if (this.last_token === 'TK_TAG_SCRIPT') { //check if we need to format javascript
        var temp_token = this.get_script();
        if (typeof temp_token !== 'string') {
          return temp_token;
        }
        token = js_beautify(temp_token,
                {indent_size: this.indent_size, indent_char: this.indent_character, indent_level: this.indent_level, brace_style: this.brace_style}); //call the JS Beautifier
        return [token, 'TK_CONTENT'];
      }
      if (this.current_mode === 'CONTENT') {
        token = this.get_content();
        if (typeof token !== 'string') {
          return token;
        }
        else {
          return [token, 'TK_CONTENT'];
        }
      }

      if(this.current_mode === 'TAG') {
        token = this.get_tag();
        if (typeof token !== 'string') {
          return token;
        }
        else {
          var tag_name_type = 'TK_TAG_' + this.tag_type;
          return [token, tag_name_type];
        }
      }
    }

    this.printer = function (js_source, indent_character, indent_size, max_char, brace_style) { //handles input/output and some other printing functions

      this.input = js_source || ''; //gets the input for the Parser
      this.output = [];
      this.indent_character = indent_character || ' ';
      this.indent_string = '';
      this.indent_size = indent_size || 2;
      this.brace_style = brace_style || 'collapse';
      this.indent_level = 0;
      this.max_char = max_char || 70; //maximum amount of characters per line
      this.line_char_count = 0; //count to see if max_char was exceeded

      for (var i=0; i<this.indent_size; i++) {
        this.indent_string += this.indent_character;
      }

      this.print_newline = function (ignore, arr) {
        this.line_char_count = 0;
        if (!arr || !arr.length) {
          return;
        }
        if (!ignore) { //we might want the extra line
          while (this.Utils.in_array(arr[arr.length-1], this.Utils.whitespace)) {
            arr.pop();
          }
        }
        arr.push('\n');
        for (var i=0; i<this.indent_level; i++) {
          arr.push(this.indent_string);
        }
      }


      this.print_token = function (text) {
        this.output.push(text);
      }

      this.indent = function () {
        this.indent_level++;
      }

      this.unindent = function () {
        if (this.indent_level > 0) {
          this.indent_level--;
        }
      }
    }
    return this;
  }

  /*_____________________--------------------_____________________*/



  multi_parser = new Parser(); //wrapping functions Parser
  multi_parser.printer(html_source, indent_character, indent_size, 80, brace_style); //initialize starting values



  while (true) {
      var t = multi_parser.get_token();
      multi_parser.token_text = t[0];
      multi_parser.token_type = t[1];

    if (multi_parser.token_type === 'TK_EOF') {
      break;
    }


    switch (multi_parser.token_type) {
      case 'TK_TAG_START': case 'TK_TAG_SCRIPT': case 'TK_TAG_STYLE':
        multi_parser.print_newline(false, multi_parser.output);
        multi_parser.print_token(multi_parser.token_text);
        multi_parser.indent();
        multi_parser.current_mode = 'CONTENT';
        break;
      case 'TK_TAG_END':
        multi_parser.print_newline(true, multi_parser.output);
        multi_parser.print_token(multi_parser.token_text);
        multi_parser.current_mode = 'CONTENT';
        break;
      case 'TK_TAG_SINGLE':
        multi_parser.print_newline(false, multi_parser.output);
        multi_parser.print_token(multi_parser.token_text);
        multi_parser.current_mode = 'CONTENT';
        break;
      case 'TK_CONTENT':
        if (multi_parser.token_text !== '') {
          multi_parser.print_newline(false, multi_parser.output);
          multi_parser.print_token(multi_parser.token_text);
        }
        multi_parser.current_mode = 'TAG';
        break;
    }
    multi_parser.last_token = multi_parser.token_type;
    multi_parser.last_text = multi_parser.token_text;
  }
  return multi_parser.output.join('');
}