---
layout:     post
title:      "FICTIONAL PROGRAMMER"
subtitle:   ""
date:       2017-06-01 00:00:00
author:     "Harry"
tags:
    - 增强学习
---

<div class="row">
    <form action="#">  
        <span style="margin-left:15px">INPUT1:</span>
        <input type='text' id='input1' class='input' />
        <span style="margin-left:20px">INPUT2:</span>
        <input type='text' id='input2' class='input' />

        <input type="submit" id="submit" class="btn btn-sm btn-primary" style="margin-left:20px" />
    </form>
    <div class="col-md-8">
    <p style="font-weight:bold">POINTERS</p>
    <table style="width:60%">
        <tr>
            <th>INPUT1</th>
            <th>INPUT2</th>
            <th>OUTPUT</th>
        </tr>
        <tr>
            <td>0</td>
            <td>0</td>
            <td>0</td>
        </tr>
    </table>

    <p style="font-weight:bold">MEMORY</p>
    <table style="width:60%">
        <tr>
            <th>MEM0</th>
            <th>MEM1</th>
            <th>MEM2</th>
        </tr>
        <tr>
            <td>0</td>
            <td>0</td>
            <td>0</td>
        </tr>
    </table>

    <p style="font-weight:bold">ENVIRONMENT</p>
    <table style="text-align:center;width:100%">
        <tr>
            <th style="width:40px"></th><th>9</th><th>8</th><th>7</th><th>6</th><th>5</th><th>4</th><th>3</th><th>2</th><th>1</th><th>0</th>
        </tr>
        <tr>
            <td>INPUT 1</td>
            <td id='ptr-env0-9'></td>
            <td id='ptr-env0-8'></td>
            <td id='ptr-env0-7'></td>
            <td id='ptr-env0-6'></td>
            <td id='ptr-env0-5'></td>
            <td id='ptr-env0-4'></td>
            <td id='ptr-env0-3'></td>
            <td id='ptr-env0-2'></td>
            <td id='ptr-env0-1'></td>
            <td id='ptr-env0-0'></td>
        </tr>
        <tr>
            <td>INPUT 2</td>
            <td id='ptr-env1-9'></td>
            <td id='ptr-env1-8'></td>
            <td id='ptr-env1-7'></td>
            <td id='ptr-env1-6'></td>
            <td id='ptr-env1-5'></td>
            <td id='ptr-env1-4'></td>
            <td id='ptr-env1-3'></td>
            <td id='ptr-env1-2'></td>
            <td id='ptr-env1-1'></td>
            <td id='ptr-env1-0'></td>
        </tr>
        <tr>
            <td>OUTPUT</td>
            <td id='ptr-output-9'></td>
            <td id='ptr-output-8'></td>
            <td id='ptr-output-7'></td>
            <td id='ptr-output-6'></td>
            <td id='ptr-output-5'></td>
            <td id='ptr-output-4'></td>
            <td id='ptr-output-3'></td>
            <td id='ptr-output-2'></td>
            <td id='ptr-output-1'></td>
            <td id='ptr-output-0'></td>
        </tr>
    </table>
    </div>

    <div class="col-md-4">
        <p style="font-weight:bold">Programs</p>


    </div>
</div>

<script>
    window.onload=function(){ 
        
        $("#submit").click(function(){
            
            $.ajax({
                type: "GET",
                url: "http://api.hackiey.com:8000/api/?input1="+$("#input1").val()+"&input2="+$("#input2").val(),
                xhrFields:{'Access-Control-Allow-Origin': '*'}}
            ).done(function(data){
                console.log ("Data Saved: " + data)
                

            }).fail(function(jqXHR, textStatus){
                console.log ("fail: " + textStatus)
            })


            return false
        })
    
    }
    
</script>