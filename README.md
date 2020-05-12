## **Descripción Tema 3 - Covid-19**
Alumno: Juan I. Pisula

Disponible en: https://juanigp.github.io/proyecto-1/

Video: https://youtu.be/z-z26MYTm88

Realizado con 
* HTML, CSS y Javascript
* DataMaps https://datamaps.github.io/
* D3.js https://d3js.org/
* API de coronatracker https://www.coronatracker.com/

Crédito a https://github.com/vtex/country-iso-3-to-2 por la función de mapeo de códigos de país ISO3 a ISO2

Algunas aclaraciones no mencionadas en el video:
* El cambio de tema se hace cambiando clases en ciertos elementos del DOM, como sería por ejemplo body .dark a body .light.
* Cada vez que se grafican las series de tiempo de un país, se eliminan los gráficos anteriores del DOM y se anexan los nuevos.
* Debido a esto, el estilo del gráfico se aplica cada vez que se crea uno.
* Los casos nuevos por día se obtienen como la diferencia de casos entre días consecutivos. 
* La ventana modal se muestra una vez que los datos fueron procesados y graficados.


