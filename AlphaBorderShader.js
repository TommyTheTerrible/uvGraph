/**
 * @author tommytheterrible
 * Copyright TommyTheTerrible
 * Copies from colored pixels onto nearby uncolored pixels and grows draw region
 */



var AlphaShader = {

	uniforms: {

		"tDiffuse": { value: null },
		"resolution": { value: null },
		"pixelSize": { value: 1. },
		"opacity": { value: 1.0 }

	},

	vertexShader: [

		"varying vec2 vUv;",

		"void main() {",

		"	vUv = uv;",
		"	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

		"}"

	].join( "\n" ),

	fragmentShader: [

		"uniform float opacity;",
		"uniform sampler2D tDiffuse;",
		"varying vec2 vUv;",
		"uniform float pixelSize;",
		"uniform vec2 resolution;",

		"void main() {",
		"   vec2 dxy = pixelSize / resolution;",		
		"	vec4 texel = texture2D( tDiffuse, vUv );",
		"   if(texel.r > 0.0 || texel.g > 0.0 || texel.b > 0.0){",
		"	   gl_FragColor = texel;",
		"   } else {",		
		"		  for (int intx=-1; intx<2; intx++) {",
		"			  float x_float = float(intx);",
		"			  for (int inty=-1; inty<2; inty++) {",
		"				if(!(intx == 0 && inty == 0)){",
		"	  			    float y_float = float(inty);",
		"					float x_coord = float(vUv.x + (dxy * x_float));",
		"					float y_coord = float(vUv.y + (dxy * y_float));",
		"					vec2 coord = vec2(x_coord, y_coord);",
		"					texel = texture2D(tDiffuse, coord);",
		"					if(texel.r > 0.0 || texel.g > 0.0 || texel.b > 0.0){",
		"			    		gl_FragColor = texture2D(tDiffuse, coord);",
		"						break;",
		"		   			}",
		"				}",
		"			  }",
		"		  }",
		"   }",

		"}"

	].join( "\n" )

};

export { AlphaShader };
